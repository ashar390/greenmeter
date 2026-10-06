import assert from "node:assert/strict";
import test from "node:test";
import { getRequestUser } from "../lib/request-user.ts";

test("returns no identity when the trusted authentication header is absent", () => {
  assert.equal(getRequestUser(new Request("https://greenmeter.example/api/session")), null);
});

test("normalizes email and decodes an authenticated display name", () => {
  const request = new Request("https://greenmeter.example/api/session", {
    headers: {
      "oai-authenticated-user-email": " Anusha@Example.com ",
      "oai-authenticated-user-full-name": "Anusha%20Sharma",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
  });

  assert.deepEqual(getRequestUser(request), {
    email: "anusha@example.com",
    displayName: "Anusha Sharma",
  });
});

test("falls back to email when an encoded display name is invalid", () => {
  const request = new Request("https://greenmeter.example/api/session", {
    headers: {
      "oai-authenticated-user-email": "user@example.com",
      "oai-authenticated-user-full-name": "%E0%A4%A",
      "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
    },
  });

  assert.equal(getRequestUser(request)?.displayName, "user@example.com");
});
