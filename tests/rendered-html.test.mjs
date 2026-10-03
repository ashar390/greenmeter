import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the GreenMeter dashboard with its intro", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>GreenMeter \| Household Energy Insights<\/title>/i);
  assert.match(html, /GreenMeter introduction/);
  assert.match(html, /Energy overview/);
  assert.match(html, /Recent usage records/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("keeps the direct dashboard route available", async () => {
  const response = await render("/dashboard");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Energy overview/);
  assert.match(html, /Emissions are trending lower/);
  assert.match(html, /Current billing cycle/);
  assert.match(html, /Electricity usage/);
  assert.match(html, /Recent usage records/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("includes production project metadata and assets", async () => {
  const [layout, page, intro, dashboard, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/intro-sequence.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(packageJson, /"name": "greenmeter"/);
  assert.match(layout, /\/og\.png/);
  assert.match(page, /IntroSequence/);
  assert.match(intro, /greenmeter-intro-seen/);
  assert.match(dashboard, /Usage must be greater than zero/);
  assert.match(dashboard, /Record saved to the GreenMeter database/);
  assert.match(dashboard, /\/api\/usage-records/);
  assert.doesNotMatch(`${page}${intro}${dashboard}`, /SkeletonPreview/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
