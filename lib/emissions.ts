export type EmissionsEstimate = {
  electricityKg: number;
  gasKg: number;
  waterKg: number;
  totalKg: number;
};

const POUNDS_TO_KILOGRAMS = 0.45359237;

export const egridRegions = {
  AKGD: { name: "ASCC Alaska Grid", poundsCo2ePerMwh: 905.109 },
  AKMS: { name: "ASCC Miscellaneous", poundsCo2ePerMwh: 522.400 },
  AZNM: { name: "WECC Southwest", poundsCo2ePerMwh: 706.189 },
  CAMX: { name: "WECC California", poundsCo2ePerMwh: 429.983 },
  ERCT: { name: "ERCOT All", poundsCo2ePerMwh: 736.629 },
  FRCC: { name: "FRCC All", poundsCo2ePerMwh: 784.785 },
  HIMS: { name: "HICC Miscellaneous", poundsCo2ePerMwh: 1133.294 },
  HIOA: { name: "HICC Oahu", poundsCo2ePerMwh: 1498.947 },
  MROE: { name: "MRO East", poundsCo2ePerMwh: 1404.963 },
  MROW: { name: "MRO West", poundsCo2ePerMwh: 926.552 },
  NEWE: { name: "NPCC New England", poundsCo2ePerMwh: 543.178 },
  NWPP: { name: "WECC Northwest", poundsCo2ePerMwh: 635.267 },
  NYCW: { name: "NPCC NYC/Westchester", poundsCo2ePerMwh: 865.744 },
  NYLI: { name: "NPCC Long Island", poundsCo2ePerMwh: 1189.333 },
  NYUP: { name: "NPCC Upstate New York", poundsCo2ePerMwh: 242.776 },
  PRMS: { name: "Puerto Rico Miscellaneous", poundsCo2ePerMwh: 1548.530 },
  RFCE: { name: "RFC East", poundsCo2ePerMwh: 599.170 },
  RFCM: { name: "RFC Michigan", poundsCo2ePerMwh: 975.978 },
  RFCW: { name: "RFC West", poundsCo2ePerMwh: 916.054 },
  RMPA: { name: "WECC Rockies", poundsCo2ePerMwh: 1042.539 },
  SPNO: { name: "SPP North", poundsCo2ePerMwh: 867.740 },
  SPSO: { name: "SPP South", poundsCo2ePerMwh: 875.567 },
  SRMV: { name: "SERC Mississippi Valley", poundsCo2ePerMwh: 741.741 },
  SRMW: { name: "SERC Midwest", poundsCo2ePerMwh: 1248.582 },
  SRSO: { name: "SERC South", poundsCo2ePerMwh: 846.007 },
  SRTV: { name: "SERC Tennessee Valley", poundsCo2ePerMwh: 903.306 },
  SRVC: { name: "SERC Virginia/Carolina", poundsCo2ePerMwh: 596.326 },
  US: { name: "United States average", poundsCo2ePerMwh: 770.884 },
} as const;

export type EgridRegionCode = keyof typeof egridRegions;
export type WaterSource = keyof typeof waterSources;

export const waterSources = {
  local_surface: { name: "Local surface water", kwhPerKgal: 3.15, range: "1.9–4.4 kWh/kgal" },
  local_groundwater: { name: "Local groundwater", kwhPerKgal: 3.7, range: "3.0–4.4 kWh/kgal" },
  distant_watershed: { name: "Distant watershed", kwhPerKgal: 15.3, range: "8.0–22.6 kWh/kgal" },
} as const;

const naturalGasKgCo2ePerTherm = 0.1 * (
  53.06
  + (1 * 28) / 1_000
  + (0.1 * 265) / 1_000
);

export function isEgridRegion(value: string): value is EgridRegionCode {
  return Object.hasOwn(egridRegions, value);
}

export function isWaterSource(value: string): value is WaterSource {
  return Object.hasOwn(waterSources, value);
}

export function electricityFactorFor(region: EgridRegionCode) {
  return (egridRegions[region].poundsCo2ePerMwh * POUNDS_TO_KILOGRAMS) / 1_000;
}

export const emissionsFactors = {
  electricity: {
    value: electricityFactorFor("AZNM"),
    unit: "kg CO2e per kWh",
    region: "EPA eGRID subregion AZNM (WECC Southwest)",
    dataYear: 2023,
    sourceName: "EPA eGRID 2023 Summary Data, Revision 2",
    sourceUrl: "https://www.epa.gov/egrid/summary-data",
  },
  naturalGas: {
    value: naturalGasKgCo2ePerTherm,
    unit: "kg CO2e per therm",
    region: "United States default stationary-combustion factor",
    dataYear: 2025,
    sourceName: "EPA 2025 GHG Emission Factors Hub",
    sourceUrl: "https://www.epa.gov/climateleadership/ghg-emission-factors-hub",
  },
  water: {
    unit: "kg CO2e per gallon",
    dataYear: 2023,
    sourceName: "U.S. DOE Facility Water Cycle and EPA eGRID",
    sourceUrl: "https://www.energy.gov/cmei/femp/facility-water-cycle-and-emissions-crosswalk",
  },
} as const;

function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function estimateEmissions(
  electricityKwh: number,
  naturalGasTherms: number,
  waterGallons = 0,
  region: EgridRegionCode = "AZNM",
  waterSource: WaterSource = "local_surface",
): EmissionsEstimate {
  const electricityKgPerKwh = electricityFactorFor(region);
  const electricityKg = electricityKwh * electricityKgPerKwh;
  const gasKg = naturalGasTherms * emissionsFactors.naturalGas.value;
  const waterKg = (waterGallons / 1_000) * waterSources[waterSource].kwhPerKgal * electricityKgPerKwh;

  return {
    electricityKg: round(electricityKg),
    gasKg: round(gasKg),
    waterKg: round(waterKg),
    totalKg: round(electricityKg + gasKg + waterKg),
  };
}
