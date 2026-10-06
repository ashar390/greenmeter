import type { NewUsageRecordInput, UtilityType } from "../db/usage-records.ts";

export type CsvImportError = { row: number; message: string };
export type CsvImportPreview = {
  rows: NewUsageRecordInput[];
  errors: CsvImportError[];
  totalRows: number;
};

const requiredHeaders = ["date", "utility", "usage", "cost"] as const;
const utilityTypes = new Set<UtilityType>(["electricity", "gas", "water"]);

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted field.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value);
}

function numericValue(value: string) {
  const cleaned = value.replace(/[$,]/g, "").trim();
  return cleaned === "" ? Number.NaN : Number(cleaned);
}

export function parseUsageCsv(csv: string, maximumRows = 500): CsvImportPreview {
  const parsed = parseCsvRows(csv.replace(/^\uFEFF/, ""));
  if (parsed.length === 0) return { rows: [], errors: [{ row: 1, message: "The file is empty." }], totalRows: 0 };

  const headers = parsed[0].map((header) => header.trim().toLowerCase());
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length) {
    return {
      rows: [],
      errors: [{ row: 1, message: `Missing required columns: ${missingHeaders.join(", ")}.` }],
      totalRows: Math.max(0, parsed.length - 1),
    };
  }

  const body = parsed.slice(1);
  if (body.length > maximumRows) {
    return { rows: [], errors: [{ row: 1, message: `Files may contain at most ${maximumRows} data rows.` }], totalRows: body.length };
  }

  const positions = Object.fromEntries(requiredHeaders.map((header) => [header, headers.indexOf(header)]));
  const rows: NewUsageRecordInput[] = [];
  const errors: CsvImportError[] = [];
  const keys = new Set<string>();

  body.forEach((fields, index) => {
    const rowNumber = index + 2;
    const date = fields[positions.date]?.trim() ?? "";
    const category = (fields[positions.utility]?.trim().toLowerCase() ?? "") as UtilityType;
    const amount = numericValue(fields[positions.usage] ?? "");
    const cost = numericValue(fields[positions.cost] ?? "");

    if (!isIsoDate(date)) errors.push({ row: rowNumber, message: "Date must use YYYY-MM-DD." });
    if (!utilityTypes.has(category)) errors.push({ row: rowNumber, message: "Utility must be electricity, gas, or water." });
    if (!Number.isFinite(amount) || amount <= 0) errors.push({ row: rowNumber, message: "Usage must be greater than zero." });
    if (!Number.isFinite(cost) || cost < 0) errors.push({ row: rowNumber, message: "Cost must be zero or greater." });

    const key = `${date}:${category}`;
    if (keys.has(key)) errors.push({ row: rowNumber, message: "This utility and date appears more than once in the file." });
    keys.add(key);

    if (!errors.some((error) => error.row === rowNumber)) {
      rows.push({ date, category, amount, costCents: Math.round(cost * 100) });
    }
  });

  return { rows, errors, totalRows: body.length };
}
