import { insertUsageRecords } from "../../../../db/usage-records";
import { parseUsageCsv } from "../../../../lib/csv-import";
import { getRequestUser } from "../../../../lib/request-user";

export const dynamic = "force-dynamic";

const MAXIMUM_FILE_BYTES = 1_000_000;

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  return env.DB as D1Database;
}

export async function POST(request: Request) {
  const user = getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in to import records." }, { status: 401 });

  try {
    const body = await request.json() as { csv?: unknown; confirm?: unknown };
    if (typeof body.csv !== "string") return Response.json({ error: "Choose a CSV file to import." }, { status: 400 });
    if (new TextEncoder().encode(body.csv).byteLength > MAXIMUM_FILE_BYTES) {
      return Response.json({ error: "CSV files must be smaller than 1 MB." }, { status: 413 });
    }

    const preview = parseUsageCsv(body.csv);
    if (body.confirm !== true) return Response.json(preview);
    if (preview.errors.length > 0 || preview.rows.length === 0) {
      return Response.json({ ...preview, error: "Fix every validation error before importing." }, { status: 422 });
    }

    const records = await insertUsageRecords(await getDatabase(), preview.rows, user.email, user.displayName);
    return Response.json({ imported: preview.rows.length, records }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "One or more readings already exist for that utility and date." }, { status: 409 });
    }
    console.error("Unable to import usage records", error);
    return Response.json({ error: "The CSV could not be imported. Please try again." }, { status: 500 });
  }
}
