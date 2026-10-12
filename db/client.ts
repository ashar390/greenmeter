export async function getDatabase(): Promise<D1Database> {
  const { env } = await import("cloudflare:workers");
  return env.DB as D1Database;
}
