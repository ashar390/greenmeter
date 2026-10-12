import assert from "node:assert/strict";
import test from "node:test";
import { getSessionUser } from "../lib/session-user.ts";

test("returns no identity when the session is absent", () => {
  assert.equal(getSessionUser(null), null);
});

test("normalizes a complete authenticated session", () => {
  const session = {
    user: {
      id: "user-123",
      email: " Anusha@Example.com ",
      name: "Anusha Sharma",
    },
    expires: "2099-01-01T00:00:00.000Z",
  };

  assert.deepEqual(getSessionUser(session), {
    id: "user-123",
    email: "anusha@example.com",
    displayName: "Anusha Sharma",
  });
});

test("requires an id and email and falls back to the email for display", () => {
  const incomplete = { user: { email: "user@example.com" }, expires: "2099-01-01T00:00:00.000Z" };
  const complete = { user: { id: "user-456", email: "USER@example.com" }, expires: "2099-01-01T00:00:00.000Z" };

  assert.equal(getSessionUser(incomplete), null);
  assert.equal(getSessionUser(complete)?.displayName, "user@example.com");
});
