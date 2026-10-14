import type { EgridRegionCode, WaterSource } from "../lib/emissions.ts";
import { getOrCreateHousehold } from "./usage-records.ts";

export type HouseholdSettings = {
  city: string;
  stateCode: string;
  postalCode: string;
  egridSubregion: EgridRegionCode;
  waterSource: WaterSource;
};

type HouseholdSettingsRow = {
  city: string | null;
  state_code: string | null;
  postal_code: string | null;
  egrid_subregion: EgridRegionCode;
  water_source: WaterSource;
};

function toSettings(row: HouseholdSettingsRow): HouseholdSettings {
  return {
    city: row.city ?? "",
    stateCode: row.state_code ?? "",
    postalCode: row.postal_code ?? "",
    egridSubregion: row.egrid_subregion,
    waterSource: row.water_source,
  };
}

export async function getHouseholdSettings(
  database: D1Database,
  ownerUserId: string,
  ownerName?: string,
) {
  const householdId = await getOrCreateHousehold(database, ownerUserId, ownerName);
  const row = await database.prepare(`
    SELECT city, state_code, postal_code, egrid_subregion, water_source
    FROM households
    WHERE id = ?
  `).bind(householdId).first<HouseholdSettingsRow>();
  if (!row) throw new Error("Household settings could not be loaded.");
  return toSettings(row);
}

export async function updateHouseholdSettings(
  database: D1Database,
  ownerUserId: string,
  ownerName: string | undefined,
  settings: HouseholdSettings,
) {
  const householdId = await getOrCreateHousehold(database, ownerUserId, ownerName);
  const locationLabel = [settings.city, settings.stateCode, settings.postalCode].filter(Boolean).join(", ");
  const row = await database.prepare(`
    UPDATE households
    SET city = ?, state_code = ?, postal_code = ?, egrid_subregion = ?, water_source = ?, address = ?
    WHERE id = ? AND owner_user_id = ?
    RETURNING city, state_code, postal_code, egrid_subregion, water_source
  `).bind(
    settings.city,
    settings.stateCode,
    settings.postalCode,
    settings.egridSubregion,
    settings.waterSource,
    locationLabel,
    householdId,
    ownerUserId,
  ).first<HouseholdSettingsRow>();
  if (!row) throw new Error("Household settings could not be saved.");
  return toSettings(row);
}
