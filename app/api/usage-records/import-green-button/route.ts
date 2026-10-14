import { getDatabase } from "../../../../db/client";
import { insertUsageRecords } from "../../../../db/usage-records";
import { parseGreenButtonXml } from "../../../../lib/green-button-import";
import { getRequestUser } from "../../../../lib/request-session";

export const dynamic = "force-dynamic";

const MAXIMUM_FILE_BYTES = 5_000_000;

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in to import records." }, { status: 401 });

  try {
    const body = await request.json() as { xml?: unknown; confirm?: unknown };
    if (typeof body.xml !== "string") {
      return Response.json({ error: "Choose a Green Button XML file to import." }, { status: 400 });
    }
    if (new TextEncoder().encode(body.xml).byteLength > MAXIMUM_FILE_BYTES) {
      return Response.json({ error: "Green Button XML files must be smaller than 5 MB." }, { status: 413 });
    }

    const preview = parseGreenButtonXml(body.xml);
    if (body.confirm !== true) return Response.json(preview);
    if (preview.errors.length > 0 || preview.rows.length === 0) {
      return Response.json({ ...preview, error: "Fix every validation error before importing." }, { status: 422 });
    }

    const records = await insertUsageRecords(
      await getDatabase(),
      preview.rows,
      user.id,
      user.displayName,
      "green_button",
    );
    return Response.json({ imported: preview.rows.length, records }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "One or more readings already exist for that utility and date." }, { status: 409 });
    }
    console.error("Unable to import Green Button records", error);
    return Response.json({ error: "The Green Button file could not be imported. Please try again." }, { status: 500 });
  }
}
