import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";

beforeAll(() => process.chdir(import.meta.dir.replace(/\/tests$/, "")));

test("an event file cannot shadow aaw's own auth events", async () => {
  expect(aaw("tests/reserved", {}, 1342, undefined, true)).rejects.toThrow(
    '"auth/" is reserved by aaw\'s authentication — rename tests/reserved/auth/login.js',
  );
});

test("the same file is fine when auth is off", async () => {
  expect(await aaw("tests/reserved", {}, 1343)).toBeDefined();
});
