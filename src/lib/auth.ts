import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { getServerSession } from "./session.server";

type LoginResult = { ok: true; username: string } | { ok: false; error: string };

export const serverLogin = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { username: string; password: string } }): Promise<LoginResult> => {
    try {
      const sql = getSql();
      const rows = await sql`SELECT id, username, password_hash FROM admin_users WHERE username = ${data.username} LIMIT 1`;
      if (!rows.length) return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
      const user = rows[0] as { id: number; username: string; password_hash: string };
      const valid = await bcrypt.compare(data.password, user.password_hash);
      if (!valid) return { ok: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };

      const session = await getServerSession();
      await session.update({ userId: user.id, username: user.username });
      return { ok: true, username: user.username };
    } catch (e: any) {
      return { ok: false, error: e?.message || "เข้าสู่ระบบไม่สำเร็จ" };
    }
  });

export const serverLogout = createServerFn({ method: "POST" })
  .handler(async () => {
    const session = await getServerSession();
    await session.clear();
  });

export const serverGetSession = createServerFn({ method: "GET" })
  .handler(async () => {
    const session = await getServerSession();
    if (!session.data?.userId) return null;
    return { username: session.data.username ?? "" };
  });
