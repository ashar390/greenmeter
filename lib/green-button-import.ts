import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { NewUsageRecordInput, UtilityType } from "../db/usage-records.ts";

export type GreenButtonImportError = { entry: number; message: string };
export type GreenButtonImportPreview = {
  rows: NewUsageRecordInput[];
  errors: GreenButtonImportError[];
  warnings: string[];
  totalIntervals: number;
  totalRows: number;
};

type XmlObject = Record<string, unknown>;
type ReadingMetadata = {
  category: UtilityType;
  multiplier: number;
  uom: number;
  currency: number | null;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  processEntities: false,
});

function arrayOf<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function objectOf(value: unknown): XmlObject | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as XmlObject : null;
}

function text(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function links(entry: XmlObject) {
  return arrayOf(entry.link).flatMap((value) => {
    const link = objectOf(value);
    return link ? [{ rel: text(link.rel), href: text(link.href), type: text(link.type) }] : [];
  });
}

function selfHref(entry: XmlObject) {
  return links(entry).find((link) => link.rel === "self")?.href ?? "";
}

function meterBaseFromIntervalEntry(entry: XmlObject) {
  const up = links(entry).find((link) => link.rel === "up")?.href ?? "";
  return up.replace(/\/IntervalBlock(?:\/.*)?$/i, "");
}

function categoryFor(commodity: number, uom: number): UtilityType | null {
  if ([1, 2, 26].includes(commodity) && uom === 72) return "electricity";
  if (commodity === 7 && uom === 169) return "gas";
  if ([9, 14].includes(commodity) && uom === 128) return "water";
  if (!commodity && uom === 72) return "electricity";
  if (!commodity && uom === 169) return "gas";
  if (!commodity && uom === 128) return "water";
  return null;
}

function readingMetadata(value: unknown): ReadingMetadata | string {
  const readingType = objectOf(value);
  if (!readingType) return "ReadingType metadata is missing.";
  const commodity = Number(text(readingType.commodity));
  const uom = Number(text(readingType.uom));
  const multiplier = Number(text(readingType.powerOfTenMultiplier) || "0");
  const accumulation = Number(text(readingType.accumulationBehaviour) || "4");
  const flowDirection = Number(text(readingType.flowDirection) || "1");
  const currencyText = text(readingType.currency);
  const currency = currencyText ? Number(currencyText) : null;
  const category = categoryFor(commodity, uom);

  if (!category) return `Unsupported Green Button commodity ${commodity || "unknown"} with unit code ${uom || "unknown"}.`;
  if (!Number.isInteger(multiplier) || multiplier < -12 || multiplier > 12) return "The reading multiplier is invalid.";
  if (accumulation !== 4) return "Only incremental interval readings are supported.";
  if (flowDirection !== 1) return "Only forward consumption readings are supported.";
  if (currency !== null && currency !== 840) return `Currency code ${currency} is not supported; GreenMeter records costs in US dollars.`;
  return { category, multiplier, uom, currency };
}

function convertedValue(raw: number, metadata: ReadingMetadata) {
  const scaled = raw * (10 ** metadata.multiplier);
  return metadata.uom === 72 ? scaled / 1_000 : scaled;
}

export function parseGreenButtonXml(xml: string, maximumIntervals = 20_000): GreenButtonImportPreview {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    return { rows: [], errors: [{ entry: 1, message: "Document type and entity declarations are not allowed." }], warnings: [], totalIntervals: 0, totalRows: 0 };
  }

  if (XMLValidator.validate(xml) !== true) {
    return { rows: [], errors: [{ entry: 1, message: "The XML document is malformed." }], warnings: [], totalIntervals: 0, totalRows: 0 };
  }

  let document: XmlObject;
  try {
    document = objectOf(parser.parse(xml.replace(/^\uFEFF/, ""))) ?? {};
  } catch {
    return { rows: [], errors: [{ entry: 1, message: "The XML document is malformed." }], warnings: [], totalIntervals: 0, totalRows: 0 };
  }

  const root = objectOf(document.feed) ?? document;
  const entries = arrayOf(root.entry).flatMap((entry) => objectOf(entry) ? [objectOf(entry)!] : []);
  const readingTypeEntries = entries.filter((entry) => objectOf(entry.content)?.ReadingType);
  const intervalEntries = entries.filter((entry) => objectOf(entry.content)?.IntervalBlock);
  if (!entries.length || !readingTypeEntries.length || !intervalEntries.length) {
    return { rows: [], errors: [{ entry: 1, message: "This is not a supported Green Button feed with ReadingType and IntervalBlock entries." }], warnings: [], totalIntervals: 0, totalRows: 0 };
  }

  const typesByHref = new Map(readingTypeEntries.map((entry) => [selfHref(entry), entry]));
  const typeHrefByMeter = new Map<string, string>();
  for (const entry of entries.filter((candidate) => objectOf(candidate.content)?.MeterReading)) {
    const meterHref = selfHref(entry);
    const typeHref = links(entry).find((link) => /ReadingType/i.test(`${link.type} ${link.href}`))?.href;
    if (meterHref && typeHref) typeHrefByMeter.set(meterHref, typeHref);
  }

  const errors: GreenButtonImportError[] = [];
  const warnings: string[] = [];
  const daily = new Map<string, { amount: number; costDollars: number; hasCost: boolean; category: UtilityType }>();
  let totalIntervals = 0;

  intervalEntries.forEach((entry, entryIndex) => {
    const meterBase = meterBaseFromIntervalEntry(entry);
    const typeHref = typeHrefByMeter.get(meterBase);
    const readingTypeEntry = (typeHref ? typesByHref.get(typeHref) : undefined)
      ?? (readingTypeEntries.length === 1 ? readingTypeEntries[0] : undefined);
    if (!readingTypeEntry) {
      errors.push({ entry: entryIndex + 1, message: "The IntervalBlock could not be linked to one ReadingType." });
      return;
    }

    const metadata = readingMetadata(objectOf(readingTypeEntry.content)?.ReadingType);
    if (typeof metadata === "string") {
      errors.push({ entry: entryIndex + 1, message: metadata });
      return;
    }

    const block = objectOf(objectOf(entry.content)?.IntervalBlock);
    const readings = arrayOf(block?.IntervalReading);
    totalIntervals += readings.length;
    if (totalIntervals > maximumIntervals) {
      errors.push({ entry: entryIndex + 1, message: `Files may contain at most ${maximumIntervals.toLocaleString()} interval readings.` });
      return;
    }

    readings.forEach((readingValue) => {
      const reading = objectOf(readingValue);
      const period = objectOf(reading?.timePeriod);
      const start = Number(text(period?.start));
      const rawValue = Number(text(reading?.value));
      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(rawValue)) {
        errors.push({ entry: entryIndex + 1, message: "An interval has an invalid start time or value." });
        return;
      }
      const amount = convertedValue(rawValue, metadata);
      if (!Number.isFinite(amount) || amount < 0) {
        errors.push({ entry: entryIndex + 1, message: "An interval produces an invalid usage value." });
        return;
      }
      const date = new Date(start * 1_000).toISOString().slice(0, 10);
      const key = `${date}:${metadata.category}`;
      const existing = daily.get(key) ?? { amount: 0, costDollars: 0, hasCost: false, category: metadata.category };
      existing.amount += amount;
      const costText = text(reading?.cost);
      const cost = Number(costText);
      if (costText && Number.isFinite(cost)) {
        existing.costDollars += cost * 0.00001;
        existing.hasCost = true;
      }
      daily.set(key, existing);
    });
  });

  if ([...daily.values()].some((value) => !value.hasCost)) {
    warnings.push("Some intervals do not include cost data; those daily records will use $0.00.");
  }
  const rows = [...daily.entries()].map(([key, value]) => ({
    date: key.slice(0, 10),
    category: value.category,
    amount: Math.round(value.amount * 1000) / 1000,
    costCents: Math.round(value.costDollars * 100),
  })).filter((row) => row.amount > 0).sort((left, right) => left.date.localeCompare(right.date));

  return { rows, errors, warnings, totalIntervals, totalRows: rows.length };
}
