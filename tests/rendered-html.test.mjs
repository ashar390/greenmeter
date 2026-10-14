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
  assert.match(html, /Your home,/);
  assert.match(html, /Recent usage records/);
  assert.match(html, /Exploring the public demo/);
  assert.match(html, /Sign in to add records/);
});

test("keeps the direct dashboard route available", async () => {
  const response = await render("/dashboard");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Your home,/);
  assert.match(html, /Estimated household emissions/);
  assert.match(html, /How this estimate works/);
  assert.match(html, /Latest recorded month/);
  assert.match(html, /Utility usage trend/);
  assert.match(html, /Recent usage records/);
});

test("renders the account sign-in page", async () => {
  const response = await render("/sign-in");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Welcome back/);
  assert.match(html, /Create account/);
  assert.match(html, /Email address/);
  assert.match(html, /Continue with GitHub/);
  assert.match(html, /never receives your GitHub password/);
});

test("includes production project configuration and assets", async () => {
  const [layout, page, intro, dashboard, packageJson, workerConfig] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/intro-sequence.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dashboard/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
  ]);

  assert.match(packageJson, /"name": "greenmeter"/);
  assert.match(layout, /\/og\.png/);
  assert.match(page, /IntroSequence/);
  assert.match(intro, /greenmeter-intro-seen/);
  assert.match(dashboard, /Usage must be greater than zero/);
  assert.match(dashboard, /Record saved to the GreenMeter database/);
  assert.match(dashboard, /\/api\/usage-records/);
  assert.match(workerConfig, /"name": "greenmeter"/);
  assert.match(workerConfig, /"binding": "DB"/);
  assert.match(workerConfig, /"migrations_dir": "drizzle"/);
  assert.doesNotMatch(`${page}${intro}${dashboard}`, /SkeletonPreview/);
});
