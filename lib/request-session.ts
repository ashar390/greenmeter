import { getDatabase } from "../db/client.ts";
import type { SessionUser } from "./session-user.ts";

const SESSION_COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"];

export function getSessionToken(cookieHeader: string | null) {
  if (!cookieHeader) return null;

  const cookies = new Map(
    cookieHeader.split(";").map((cookie) => {
      const separator = cookie.indexOf("=");
      if (separator < 0) return [cookie.trim(), ""];
      return [cookie.slice(0, separator).trim(), decodeURIComponent(cookie.slice(separator + 1).trim())];
    }),
  );

  for (const name of SESSION_COOKIE_NAMES) {
    const token = cookies.get(name)?.trim();
    if (token) return token;
  }
  return null;
}

export async function getRequestUser(request: Request): Promise<SessionUser | null> {
  const sessionToken = getSessionToken(request.headers.get("cookie"));
  if (!sessionToken) return null;

  const user = await (await getDatabase()).prepare(`
    SELECT users.id, users.name, users.email
    FROM sessions
    INNER JOIN users ON users.id = sessions.userId
    WHERE sessions.sessionToken = ? AND sessions.expires > ?
  `).bind(sessionToken, new Date().toISOString()).first<{
    id: string;
    name: string | null;
    email: string | null;
  }>();

  const email = user?.email?.trim().toLowerCase();
  if (!user?.id || !email) return null;

  return {
    id: user.id,
    email,
    displayName: user.name?.trim() || email,
  };
}

