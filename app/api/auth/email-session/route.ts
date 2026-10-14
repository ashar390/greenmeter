import { verifyPassword } from "../../../../lib/password";

export const dynamic = "force-dynamic";

type SignInInput = {
  email?: unknown;
  password?: unknown;
};

const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60;

function createSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return Response.json({ error: "Sign-in request was rejected." }, { status: 403 });
  }

  let input: SignInInput;
  try {
    input = await request.json() as SignInInput;
  } catch {
    return Response.json({ error: "Email or password is incorrect." }, { status: 400 });
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || !password) {
    return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB: D1Database }).DB;
  const record = await database.prepare(`
    SELECT
      users.id,
      password_credentials.password_hash AS passwordHash,
      password_credentials.salt,
      password_credentials.iterations
    FROM users
    INNER JOIN password_credentials ON password_credentials.user_id = users.id
    WHERE users.email = ?
  `).bind(email).first<{
    id: string;
    passwordHash: string;
    salt: string;
    iterations: number;
  }>();

  if (!record || !await verifyPassword(password, record.passwordHash, record.salt, record.iterations)) {
    return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  }

  const sessionToken = createSessionToken();
  const expires = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
  await database.batch([
    database.prepare("DELETE FROM sessions WHERE expires < ?").bind(new Date().toISOString()),
    database.prepare(`
      INSERT INTO sessions (id, sessionToken, userId, expires)
      VALUES (?, ?, ?, ?)
    `).bind(crypto.randomUUID(), sessionToken, record.id, expires.toISOString()),
  ]);

  const secure = requestUrl.protocol === "https:";
  const cookieName = secure ? "__Secure-authjs.session-token" : "authjs.session-token";
  const cookie = [
    `${cookieName}=${sessionToken}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DURATION_SECONDS}`,
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");

  return Response.json(
    { authenticated: true },
    { headers: { "cache-control": "no-store", "set-cookie": cookie } },
  );
}
