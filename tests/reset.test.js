import { afterAll, beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { clearDatabase, connect, rejection, root } from "./helpers.js";

const PORT = 1358;
const DATABASE = "tests/reset.test.sqlite";

beforeAll(async () => {
  root();
  clearDatabase(DATABASE);
  await aaw("tests/events", {}, PORT, undefined, { database: DATABASE });
});

afterAll(() => clearDatabase(DATABASE));

test("a reset the server cannot deliver is an error, not a success", async () => {
  const socket = await connect(PORT);

  await socket.sendAsync("aaw/register", { email: "a@example.com", password: "hunter2" });

  expect(
    await rejection(socket.sendAsync("aaw/password/request-reset", { email: "a@example.com" })),
  ).toBe("Password reset is not configured (no onPasswordReset handler)");

  socket.close();
});

test("the same error answers for an unknown address, so it cannot enumerate", async () => {
  const socket = await connect(PORT);

  expect(
    await rejection(socket.sendAsync("aaw/password/request-reset", { email: "nobody@example.com" })),
  ).toBe("Password reset is not configured (no onPasswordReset handler)");

  socket.close();
});
