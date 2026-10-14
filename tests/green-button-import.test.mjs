import assert from "node:assert/strict";
import test from "node:test";
import { parseGreenButtonXml } from "../lib/green-button-import.ts";

const electricityFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:espi="http://naesb.org/espi">
  <entry>
    <link rel="self" href="/ReadingType/1" />
    <content><espi:ReadingType><espi:accumulationBehaviour>4</espi:accumulationBehaviour><espi:commodity>1</espi:commodity><espi:currency>840</espi:currency><espi:flowDirection>1</espi:flowDirection><espi:powerOfTenMultiplier>0</espi:powerOfTenMultiplier><espi:uom>72</espi:uom></espi:ReadingType></content>
  </entry>
  <entry>
    <link rel="self" href="/MeterReading/1" />
    <link rel="related" href="/ReadingType/1" type="espi-entry/ReadingType" />
    <content><espi:MeterReading /></content>
  </entry>
  <entry>
    <link rel="up" href="/MeterReading/1/IntervalBlock" />
    <content><espi:IntervalBlock>
      <espi:IntervalReading><espi:cost>125000</espi:cost><espi:timePeriod><espi:start>1790812800</espi:start><espi:duration>3600</espi:duration></espi:timePeriod><espi:value>1500</espi:value></espi:IntervalReading>
      <espi:IntervalReading><espi:cost>75000</espi:cost><espi:timePeriod><espi:start>1790816400</espi:start><espi:duration>3600</espi:duration></espi:timePeriod><espi:value>500</espi:value></espi:IntervalReading>
    </espi:IntervalBlock></content>
  </entry>
</feed>`;

test("converts Green Button electricity intervals into daily kWh and dollars", () => {
  const result = parseGreenButtonXml(electricityFeed);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.totalIntervals, 2);
  assert.deepEqual(result.rows, [
    { date: "2026-10-01", category: "electricity", amount: 2, costCents: 200 },
  ]);
});

test("supports gas and water Green Button unit codes and warns when cost is absent", () => {
  const feed = electricityFeed
    .replaceAll("<espi:commodity>1</espi:commodity>", "<espi:commodity>9</espi:commodity>")
    .replaceAll("<espi:uom>72</espi:uom>", "<espi:uom>128</espi:uom>")
    .replaceAll("<espi:cost>125000</espi:cost>", "")
    .replaceAll("<espi:cost>75000</espi:cost>", "")
    .replaceAll("<espi:value>1500</espi:value>", "<espi:value>100</espi:value>")
    .replaceAll("<espi:value>500</espi:value>", "<espi:value>25</espi:value>");

  const result = parseGreenButtonXml(feed);
  assert.deepEqual(result.rows, [
    { date: "2026-10-01", category: "water", amount: 125, costCents: 0 },
  ]);
  assert.match(result.warnings[0], /do not include cost data/);
});

test("rejects unsafe or unsupported XML", () => {
  assert.match(parseGreenButtonXml("<!DOCTYPE feed [<!ENTITY x SYSTEM 'file:///etc/passwd'>]><feed />").errors[0].message, /not allowed/);
  assert.match(parseGreenButtonXml("<feed><entry></feed>").errors[0].message, /malformed/);
  assert.match(parseGreenButtonXml("<feed><entry><content /></entry></feed>").errors[0].message, /not a supported Green Button feed/);
});
