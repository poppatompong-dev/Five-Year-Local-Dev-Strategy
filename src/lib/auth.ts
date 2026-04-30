import { createServerFn } from "@tanstack/react-start";
import bcrypt from "bcryptjs";
import { getSql } from "./db";
import { getServerSession } from "./session.server";

export const serverLogin = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { username: string; password: string } }) => {
    const sql = getSql();
    const rows = await sql`SELECT id, username, password_hash FROM admin_users WHERE username = ${data.username} LIMIT 1`;
    if (!rows.length) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
    const user = rows[0] as { id: number; username: string; password_hash: string };
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");

    const session = await getServerSession();
    await session.update({ userId: user.id, username: user.username });
    return { username: user.username };
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
