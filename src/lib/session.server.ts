import { useSession } from "@tanstack/react-start/server";

export interface SessionData {
  userId?: number;
  username?: string;
}

export const SESSION_NAME = "admin_session";

export function getSessionConfig() {
  const password = process.env["SESSION_PASSWORD"];
  if (!password || password.length < 32) {
    throw new Error("SESSION_PASSWORD env var must be set and at least 32 chars");
  }
  return {
    name: SESSION_NAME,
    password,
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      sameSite: "lax" as const,
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      path: "/",
    },
  };
}

export async function getServerSession() {
  return useSession<SessionData>(getSessionConfig());
}

export async function requireAdmin() {
  const session = await getServerSession();
  if (!session.data?.userId) {
    throw new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return session.data;
}
