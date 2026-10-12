import { getDatabase } from "../../../db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await getDatabase();
    const schema = await database.prepare(`
      SELECT COUNT(*) AS count
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('users', 'accounts', 'sessions', 'verification_tokens', 'households', 'usage_records', 'reduction_goals')
    `).first<{ count: number }>();
    const demo = await database.prepare(`
      SELECT COUNT(*) AS count
      FROM households
      WHERE name = 'GreenMeter demo home'
        AND address = '1842 East Lemon Street'
        AND owner_user_id IS NULL
    `).first<{ count: number }>();

    if (schema?.count !== 7 || demo?.count !== 1) {
      return Response.json(
        { status: "unavailable", database: "incomplete" },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }

    return Response.json(
      { status: "ok", database: "ready" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Database health check failed", error);
    return Response.json(
      { status: "unavailable", database: "unreachable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
