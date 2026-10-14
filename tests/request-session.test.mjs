import assert from "node:assert/strict";
import test from "node:test";
import { getSessionToken } from "../lib/request-session.ts";

test("reads local and secure Auth.js session cookies", () => {
  assert.equal(getSessionToken("theme=dark; authjs.session-token=local-token"), "local-token");
  assert.equal(getSessionToken("__Secure-authjs.session-token=secure-token; theme=dark"), "secure-token");
  assert.equal(getSessionToken("theme=dark"), null);
  assert.equal(getSessionToken(null), null);
});
