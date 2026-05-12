import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { getServerSession } from "./session.server";

type LoginResult = { ok: true; username: string } | { ok: false; error: string };
type LoginAttempt = { count: number; windowStart: number; lockedUntil?: number };

const usernameAttempts = new Map<string, LoginAttempt>();
const ipAttempts = new Map<string, LoginAttempt>();
const globalAttempts: LoginAttempt = { count: 0, windowStart: 0 };
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 60_000,
  lockMs: 60_000,
  globalMaxAttempts: 60,
} as const;

function auditMeta(action: "login" | "logout") {
  return {
    eventId: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    source: "server-fn",
    entity: "auth",
    action,
    recordedAt: new Date().toISOString(),
  };
}

async function insertAuthAudit(sql: any, action: "login" | "logout", after: Record<string, unknown>) {
  await sql`
    INSERT INTO audit_events (action, entity, entity_id, before, after)
    VALUES (${action}, ${"auth"}, ${null}, ${null}, ${JSON.stringify({ system: auditMeta(action), ...after })})
  `;
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().split("@")[0].replace(/[^a-z0-9._-]/g, "");
}

function loginSetupError(error: any) {
  const message = String(error?.message ?? "");
  const code = String(error?.code ?? "");
  if (message.includes("DATABASE_URL")) return "DATABASE_URL_MISSING";
  if (message.includes("SESSION_PASSWORD")) return "SESSION_PASSWORD_MISSING";
  if (code === "42P01" || (/admin_users/i.test(message) && /does not exist|relation/i.test(message))) {
    return "ADMIN_USERS_TABLE_MISSING";
  }
  return null;
}

function getClientKey() {
  try {
    const ip = getRequestIP({ xForwardedFor: true });
    if (ip) return ip;
    return getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

function registerFailure(map: Map<string, LoginAttempt>, key: string, now: number) {
  const prev = map.get(key);
  const base = !prev || now - prev.windowStart >= RATE_LIMIT.windowMs
    ? { count: 0, windowStart: now }
    : prev;
  const count = base.count + 1;
  map.set(key, {
    count,
    windowStart: base.windowStart,
    lockedUntil: count >= RATE_LIMIT.maxAttempts ? now + RATE_LIMIT.lockMs : base.lockedUntil,
  });
}

function isLocked(attempt: LoginAttempt | undefined, now: number) {
  if (!attempt) return false;
  if (attempt.lockedUntil && attempt.lockedUntil > now) return true;
  return attempt.count >= RATE_LIMIT.maxAttempts && now - attempt.windowStart < RATE_LIMIT.windowMs;
}

function registerGlobalFailure(now: number) {
  if (!globalAttempts.windowStart || now - globalAttempts.windowStart >= RATE_LIMIT.windowMs) {
    globalAttempts.count = 0;
    globalAttempts.windowStart = now;
    globalAttempts.lockedUntil = undefined;
  }
  globalAttempts.count += 1;
  if (globalAttempts.count >= RATE_LIMIT.globalMaxAttempts) {
    globalAttempts.lockedUntil = now + RATE_LIMIT.lockMs;
  }
}

function isGlobalLocked(now: number) {
  return !!globalAttempts.lockedUntil && globalAttempts.lockedUntil > now;
}

export const serverLogin = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { username: string; password: string } }): Promise<LoginResult> => {
    try {
      const sql = getSql();
      const username = normalizeUsername(data.username);
      const clientKey = getClientKey();
      const now = Date.now();

      if (process.env.ADMIN_LOGIN_ENABLED === "false") {
        await insertAuthAudit(sql, "login", { username, success: false, reason: "admin_login_disabled", clientKey }).catch(() => {});
        return { ok: false, error: "ADMIN_LOGIN_DISABLED" };
      }

      const allowedIps = (process.env.ADMIN_IP_ALLOWLIST ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      if (allowedIps.length > 0 && !allowedIps.includes(clientKey)) {
        await insertAuthAudit(sql, "login", { username, success: false, reason: "ip_not_allowed", clientKey }).catch(() => {});
        return { ok: false, error: "ADMIN_LOGIN_NOT_ALLOWED" };
      }

      if (
        isLocked(usernameAttempts.get(username), now) ||
        isLocked(ipAttempts.get(clientKey), now) ||
        isGlobalLocked(now)
      ) {
        await insertAuthAudit(sql, "login", { username, success: false, reason: "rate_limited", clientKey }).catch(() => {});
        return { ok: false, error: "TOO_MANY_ATTEMPTS" };
      }

      const rows = await sql`SELECT id, username, password_hash FROM admin_users WHERE username = ${username} LIMIT 1`;
      if (!rows.length) {
        const countRows = await sql`SELECT COUNT(*)::int AS count FROM admin_users`;
        const adminCount = Number((countRows[0] as any)?.count ?? 0);
        const reason = adminCount === 0 ? "admin_users_empty" : "user_not_found";
        await insertAuthAudit(sql, "login", { username, success: false, reason, clientKey }).catch(() => {});
        registerFailure(usernameAttempts, username || "blank", now);
        registerFailure(ipAttempts, clientKey, now);
        registerGlobalFailure(now);
        if (adminCount === 0) {
          return { ok: false, error: "ADMIN_USERS_NOT_SEEDED" };
        }
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      }

      const user = rows[0] as { id: number; username: string; password_hash: string };
      const valid = await bcrypt.compare(data.password, user.password_hash);
      if (!valid) {
        await insertAuthAudit(sql, "login", { username: user.username, userId: user.id, success: false, reason: "invalid_password", clientKey }).catch(() => {});
        registerFailure(usernameAttempts, username, now);
        registerFailure(ipAttempts, clientKey, now);
        registerGlobalFailure(now);
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      }

      usernameAttempts.delete(username);
      ipAttempts.delete(clientKey);
      const session = await getServerSession();
      await session.update({ userId: user.id, username: user.username });
      await insertAuthAudit(sql, "login", { username: user.username, userId: user.id, success: true, clientKey }).catch(() => {});
      return { ok: true, username: user.username };
    } catch (e: any) {
      const setupError = loginSetupError(e);
      return { ok: false, error: setupError || e?.message || "เข้าสู่ระบบไม่สำเร็จ" };
    }
  });

export const serverLogout = createServerFn({ method: "POST" })
  .handler(async () => {
    const session = await getServerSession();
    if (session.data?.userId) {
      await insertAuthAudit(getSql(), "logout", {
        username: session.data.username ?? null,
        userId: session.data.userId,
        success: true,
        clientKey: getClientKey(),
      }).catch(() => {});
    }
    await session.clear();
  });

export const serverGetSession = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await getServerSession();
    if (!session.data?.userId) return null;
    return { username: session.data.username ?? "" };
  });
