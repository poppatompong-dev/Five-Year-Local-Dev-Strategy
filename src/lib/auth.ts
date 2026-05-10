import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { getServerSession } from "./session.server";

type LoginResult = { ok: true; username: string } | { ok: false; error: string };

const loginAttempts = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = { maxAttempts: 5, windowMs: 60_000 } as const;

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

export const serverLogin = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { username: string; password: string } }): Promise<LoginResult> => {
    try {
      const sql = getSql();
      const username = data.username.trim().toLowerCase().split("@")[0];

      // Rate limiting: 5 failures within 60 seconds → block
      const now = Date.now();
      const attempt = loginAttempts.get(username);
      if (attempt && attempt.count >= RATE_LIMIT.maxAttempts && now - attempt.windowStart < RATE_LIMIT.windowMs) {
        return { ok: false, error: "TOO_MANY_ATTEMPTS" };
      }

      const rows = await sql`SELECT id, username, password_hash FROM admin_users WHERE username = ${username} LIMIT 1`;
      if (!rows.length) {
        await insertAuthAudit(sql, "login", { username, success: false, reason: "user_not_found" }).catch(() => {});
        const prev = loginAttempts.get(username);
        loginAttempts.set(username, { count: (prev?.count ?? 0) + 1, windowStart: prev?.windowStart ?? now });
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      }

      const user = rows[0] as { id: number; username: string; password_hash: string };
      const valid = await bcrypt.compare(data.password, user.password_hash);
      if (!valid) {
        await insertAuthAudit(sql, "login", { username: user.username, userId: user.id, success: false, reason: "invalid_password" }).catch(() => {});
        const prev = loginAttempts.get(username);
        loginAttempts.set(username, { count: (prev?.count ?? 0) + 1, windowStart: prev?.windowStart ?? now });
        return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      }

      loginAttempts.delete(username);
      const session = await getServerSession();
      await session.update({ userId: user.id, username: user.username });
      await insertAuthAudit(sql, "login", { username: user.username, userId: user.id, success: true }).catch(() => {});
      return { ok: true, username: user.username };
    } catch (e: any) {
      return { ok: false, error: e?.message || "เข้าสู่ระบบไม่สำเร็จ" };
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
