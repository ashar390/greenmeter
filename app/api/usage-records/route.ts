import { insertUsageRecord, listUsageRecords, type UtilityType } from "../../../db/usage-records";
import { getRequestUser } from "../../../lib/request-user";

export const dynamic = "force-dynamic";

const utilityTypes = new Set<UtilityType>(["electricity", "gas", "water"]);

async function getDatabase() {
  const { env } = await import("cloudflare:workers");
  return env.DB as D1Database;
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

export async function GET(request: Request) {
  try {
    const user = getRequestUser(request);
    const records = await listUsageRecords(await getDatabase(), user?.email, user?.displayName);
    return Response.json({ records, mode: user ? "personal" : "demo" });
  } catch (error) {
    console.error("Unable to load usage records", error);
    return Response.json({ error: "Usage records are temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = getRequestUser(request);
    if (!user) {
      return Response.json(
        { error: "Sign in to add records to a private household." },
        { status: 401 },
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const category = typeof body.category === "string" ? body.category.toLowerCase() : "";
    const amount = Number(body.amount);
    const cost = Number(body.cost);

    if (!utilityTypes.has(category as UtilityType)) {
      return Response.json({ error: "Choose electricity, gas, or water." }, { status: 400 });
    }
    if (!isIsoDate(body.date)) {
      return Response.json({ error: "Enter a valid reading date." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return Response.json({ error: "Usage must be greater than zero." }, { status: 400 });
    }
    if (!Number.isFinite(cost) || cost < 0) {
      return Response.json({ error: "Cost cannot be negative." }, { status: 400 });
    }

    const record = await insertUsageRecord(await getDatabase(), {
      date: body.date,
      category: category as UtilityType,
      amount,
      costCents: Math.round(cost * 100),
    }, user.email, user.displayName);

    return Response.json({ record }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "A reading for this utility and date already exists." }, { status: 409 });
    }
    console.error("Unable to save usage record", error);
    return Response.json({ error: "The record could not be saved. Please try again." }, { status: 500 });
  }
}
