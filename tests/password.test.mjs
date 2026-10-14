import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, validatePassword, verifyPassword } from "../lib/password.ts";

test("validates password length and composition", () => {
  assert.match(validatePassword("short1") ?? "", /at least 10 characters/);
  assert.match(validatePassword("letters-only") ?? "", /letter and one number/);
  assert.equal(validatePassword("household42"), null);
});

test("hashes and verifies passwords without storing the original value", async () => {
  const password = "household42";
  const stored = await hashPassword(password);

  assert.notEqual(stored.hash, password);
  assert.ok(stored.salt.length > 0);
  assert.equal(stored.iterations, 210000);
  assert.equal(await verifyPassword(password, stored.hash, stored.salt, stored.iterations), true);
  assert.equal(await verifyPassword("different42", stored.hash, stored.salt, stored.iterations), false);
});
