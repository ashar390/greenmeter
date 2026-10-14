import { hashPassword, validatePassword } from "../../../../lib/password";

export const dynamic = "force-dynamic";

type RegistrationInput = {
  name?: unknown;
  email?: unknown;
  password?: unknown;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return Response.json({ error: "Account request was rejected." }, { status: 403 });
  }

  let input: RegistrationInput;
  try {
    input = await request.json() as RegistrationInput;
  } catch {
    return Response.json({ error: "Enter your name, email, and password." }, { status: 400 });
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (name.length < 2 || name.length > 80) {
    return Response.json({ error: "Name must be between 2 and 80 characters." }, { status: 400 });
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return Response.json({ error: passwordError }, { status: 400 });
  }

  const { env } = await import("cloudflare:workers");
  const database = (env as unknown as { DB: D1Database }).DB;
  const existing = await database.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return Response.json({ error: "An account already exists for this email address." }, { status: 409 });
  }

  const userId = crypto.randomUUID();
  const passwordRecord = await hashPassword(password);

  try {
    await database.batch([
      database.prepare("INSERT INTO users (id, name, email) VALUES (?, ?, ?)").bind(userId, name, email),
      database.prepare(`
        INSERT INTO password_credentials (user_id, password_hash, salt, iterations)
        VALUES (?, ?, ?, ?)
      `).bind(userId, passwordRecord.hash, passwordRecord.salt, passwordRecord.iterations),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE")) {
      return Response.json({ error: "An account already exists for this email address." }, { status: 409 });
    }
    throw error;
  }

  return Response.json({ created: true }, { status: 201 });
}
