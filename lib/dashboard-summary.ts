import { estimateEmissions, type EgridRegionCode, type EmissionsEstimate, type WaterSource } from "./emissions.ts";

export type ReportingPeriod = "current" | "previous" | "last12";

export type DashboardUsageRecord = {
  id: number;
  date: string;
  category: "Electricity" | "Gas" | "Water";
  amount: number;
  unit: string;
  cost: number;
  source: string;
};

export type UtilityTotal = {
  amount: number;
  unit: string;
  changePercent: number | null;
};

export type UtilityDay = {
  date: string;
  amount: number;
  label: string;
};

export type DashboardSummary = {
  periodLabel: string;
  dateRangeLabel: string;
  daysRecorded: number;
  daysInPeriod: number;
  reportingProgress: number;
  totalCost: number;
  electricity: UtilityTotal;
  water: UtilityTotal;
  gas: UtilityTotal;
  emissions: EmissionsEstimate & { changePercent: number | null };
  electricityDays: UtilityDay[];
  utilityDays: Record<DashboardUsageRecord["category"], UtilityDay[]>;
  utilityAverages: Record<DashboardUsageRecord["category"], number | null>;
  utilityHighest: Record<DashboardUsageRecord["category"], number | null>;
  utilityChartMaximum: Record<DashboardUsageRecord["category"], number>;
  electricityAverage: number | null;
  electricityHighest: number | null;
  chartMaximum: number;
};

const utilityUnits = {
  Electricity: "kWh",
  Water: "gal",
  Gas: "therms",
} as const;

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, amount: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
}

function endOfMonth(date: Date) {
  return new Date(addMonths(startOfMonth(date), 1).valueOf() - 1);
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function totalFor(records: DashboardUsageRecord[], category: DashboardUsageRecord["category"]) {
  return records
    .filter((record) => record.category === category)
    .reduce((total, record) => total + record.amount, 0);
}

function changePercent(current: number, previous: number) {
  if (previous <= 0) return null;
  return round(((current - previous) / previous) * 100);
}

function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function recordsBetween(records: DashboardUsageRecord[], start: Date, end: Date) {
  const first = toIsoDate(start);
  const last = toIsoDate(end);
  return records.filter((record) => record.date >= first && record.date <= last);
}

function formatDateRange(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${formatter.format(start)}–${formatter.format(end)}`;
}

export function calculateDashboardSummary(
  records: DashboardUsageRecord[],
  period: ReportingPeriod,
  emissionsProfile: { region: EgridRegionCode; waterSource: WaterSource } = { region: "AZNM", waterSource: "local_surface" },
): DashboardSummary {
  const latestDate = records.length
    ? records.reduce((latest, record) => record.date > latest ? record.date : latest, records[0].date)
    : new Date().toISOString().slice(0, 10);
  const latestMonth = startOfMonth(parseDate(latestDate));

  const periodStart = period === "current"
    ? latestMonth
    : period === "previous"
      ? addMonths(latestMonth, -1)
      : addMonths(latestMonth, -11);
  const periodEnd = period === "last12"
    ? endOfMonth(latestMonth)
    : endOfMonth(periodStart);
  const comparisonStart = period === "last12" ? addMonths(periodStart, -12) : addMonths(periodStart, -1);
  const comparisonEnd = new Date(periodStart.valueOf() - 1);

  const currentRecords = recordsBetween(records, periodStart, periodEnd);
  const comparisonRecords = recordsBetween(records, comparisonStart, comparisonEnd);
  const electricity = totalFor(currentRecords, "Electricity");
  const water = totalFor(currentRecords, "Water");
  const gas = totalFor(currentRecords, "Gas");
  const emissions = estimateEmissions(electricity, gas, water, emissionsProfile.region, emissionsProfile.waterSource);
  const comparisonEmissions = estimateEmissions(
    totalFor(comparisonRecords, "Electricity"),
    totalFor(comparisonRecords, "Gas"),
    totalFor(comparisonRecords, "Water"),
    emissionsProfile.region,
    emissionsProfile.waterSource,
  );
  const utilityDays = Object.fromEntries(["Electricity", "Water", "Gas"].map((category) => [category, currentRecords
    .filter((record) => record.category === category)
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((record) => ({
      date: record.date,
      amount: record.amount,
      label: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(parseDate(record.date)),
    }))])) as DashboardSummary["utilityDays"];
  const electricityDays = utilityDays.Electricity;
  const totals = { Electricity: electricity, Water: water, Gas: gas };
  const utilityAverages = Object.fromEntries(Object.entries(utilityDays).map(([category, days]) => [category, days.length ? round(totals[category as keyof typeof totals] / days.length) : null])) as DashboardSummary["utilityAverages"];
  const utilityHighest = Object.fromEntries(Object.entries(utilityDays).map(([category, days]) => [category, days.length ? round(Math.max(...days.map((record) => record.amount))) : null])) as DashboardSummary["utilityHighest"];
  const utilityChartMaximum = Object.fromEntries(Object.entries(utilityHighest).map(([category, highest]) => [category, highest === null ? 10 : Math.max(10, Math.ceil(highest / 10) * 10)])) as DashboardSummary["utilityChartMaximum"];
  const uniqueDays = new Set(currentRecords.map((record) => record.date)).size;
  const daysInPeriod = Math.round((periodEnd.valueOf() - periodStart.valueOf()) / 86_400_000) + 1;
  const electricityHighest = electricityDays.length
    ? Math.max(...electricityDays.map((record) => record.amount))
    : null;

  return {
    periodLabel: period === "current" ? "Latest recorded month" : period === "previous" ? "Previous month" : "Last 12 recorded months",
    dateRangeLabel: formatDateRange(periodStart, periodEnd),
    daysRecorded: uniqueDays,
    daysInPeriod,
    reportingProgress: daysInPeriod ? Math.min(100, (uniqueDays / daysInPeriod) * 100) : 0,
    totalCost: round(currentRecords.reduce((total, record) => total + record.cost, 0), 2),
    electricity: {
      amount: round(electricity),
      unit: utilityUnits.Electricity,
      changePercent: changePercent(electricity, totalFor(comparisonRecords, "Electricity")),
    },
    water: {
      amount: round(water),
      unit: utilityUnits.Water,
      changePercent: changePercent(water, totalFor(comparisonRecords, "Water")),
    },
    gas: {
      amount: round(gas),
      unit: utilityUnits.Gas,
      changePercent: changePercent(gas, totalFor(comparisonRecords, "Gas")),
    },
    emissions: {
      ...emissions,
      changePercent: changePercent(emissions.totalKg, comparisonEmissions.totalKg),
    },
    electricityDays,
    utilityDays,
    utilityAverages,
    utilityHighest,
    utilityChartMaximum,
    electricityAverage: utilityAverages.Electricity,
    electricityHighest: electricityHighest === null ? null : round(electricityHighest),
    chartMaximum: utilityChartMaximum.Electricity,
  };
}
