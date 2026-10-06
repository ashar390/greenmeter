export type EmissionsEstimate = {
  electricityKg: number;
  gasKg: number;
  totalKg: number;
};

const POUNDS_TO_KILOGRAMS = 0.45359237;
const NATURAL_GAS_MMBTU_PER_THERM = 0.1;
const NATURAL_GAS_KG_CO2_PER_MMBTU = 53.06;
const NATURAL_GAS_G_CH4_PER_MMBTU = 1;
const NATURAL_GAS_G_N2O_PER_MMBTU = 0.1;
const CH4_GLOBAL_WARMING_POTENTIAL = 28;
const N2O_GLOBAL_WARMING_POTENTIAL = 265;

const naturalGasKgCo2ePerTherm = NATURAL_GAS_MMBTU_PER_THERM * (
  NATURAL_GAS_KG_CO2_PER_MMBTU
  + (NATURAL_GAS_G_CH4_PER_MMBTU * CH4_GLOBAL_WARMING_POTENTIAL) / 1_000
  + (NATURAL_GAS_G_N2O_PER_MMBTU * N2O_GLOBAL_WARMING_POTENTIAL) / 1_000
);

export const emissionsFactors = {
  electricity: {
    value: (706.189 * POUNDS_TO_KILOGRAMS) / 1_000,
    unit: "kg CO2e per kWh",
    region: "EPA eGRID subregion AZNM (WECC Southwest)",
    dataYear: 2023,
    sourceName: "EPA eGRID 2023 Summary Data",
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
} as const;

function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function estimateEmissions(electricityKwh: number, naturalGasTherms: number): EmissionsEstimate {
  const electricityKg = electricityKwh * emissionsFactors.electricity.value;
  const gasKg = naturalGasTherms * emissionsFactors.naturalGas.value;

  return {
    electricityKg: round(electricityKg),
    gasKg: round(gasKg),
    totalKg: round(electricityKg + gasKg),
  };
}
