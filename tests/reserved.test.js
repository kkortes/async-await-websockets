import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { root } from "./helpers.js";

beforeAll(root);

test("an event file cannot shadow aaw's own events", async () => {
  expect(aaw("tests/reserved", {}, 1354, undefined, true)).rejects.toThrow(
    '"aaw/" is reserved by aaw\'s authentication — rename tests/reserved/aaw/login.js',
  );
});

test("the same file is fine when auth is off", async () => {
  const server = await aaw("tests/reserved", {}, 1355);

  expect(server.port).toBe(1355);

  server.stop(true);
});
