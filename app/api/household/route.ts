import { getDatabase } from "../../../db/client";
import { getHouseholdSettings, updateHouseholdSettings } from "../../../db/household-settings";
import { isEgridRegion, isWaterSource } from "../../../lib/emissions";
import { getRequestUser } from "../../../lib/request-session";

export const dynamic = "force-dynamic";

const POSTAL_CODE = /^\d{5}$/;
const STATE_CODE = /^[A-Z]{2}$/;

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in to view household settings." }, { status: 401 });
  const settings = await getHouseholdSettings(await getDatabase(), user.id, user.displayName);
  return Response.json({ settings });
}

export async function PUT(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Sign in to update household settings." }, { status: 401 });

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== requestUrl.origin) {
    return Response.json({ error: "Household update was rejected." }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const stateCode = typeof body.stateCode === "string" ? body.stateCode.trim().toUpperCase() : "";
    const postalCode = typeof body.postalCode === "string" ? body.postalCode.trim() : "";
    const egridSubregion = typeof body.egridSubregion === "string" ? body.egridSubregion : "";
    const waterSource = typeof body.waterSource === "string" ? body.waterSource : "";

    if (city.length < 2 || city.length > 80) return Response.json({ error: "Enter a valid city." }, { status: 400 });
    if (!STATE_CODE.test(stateCode)) return Response.json({ error: "Use a two-letter state or territory code." }, { status: 400 });
    if (!POSTAL_CODE.test(postalCode)) return Response.json({ error: "Enter a five-digit ZIP code." }, { status: 400 });
    if (!isEgridRegion(egridSubregion)) return Response.json({ error: "Choose a valid EPA eGRID region." }, { status: 400 });
    if (!isWaterSource(waterSource)) return Response.json({ error: "Choose a valid water supply type." }, { status: 400 });

    const settings = await updateHouseholdSettings(await getDatabase(), user.id, user.displayName, {
      city, stateCode, postalCode, egridSubregion, waterSource,
    });
    return Response.json({ settings });
  } catch (error) {
    console.error("Unable to update household settings", error);
    return Response.json({ error: "Household settings could not be saved." }, { status: 500 });
  }
}
