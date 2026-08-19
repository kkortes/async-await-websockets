import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import client from "../client.js";

const PORT = 1340;

const connect = () => {
  const ws = client(`ws://localhost:${PORT}`);
  return new Promise((resolve) => ws.addEventListener("open", () => resolve(ws)));
};

// Auth is opt-in: without it aaw stays the transport it has always been.
beforeAll(async () => {
  process.chdir(import.meta.dir.replace(/\/tests$/, ""));
  await aaw("tests/events", {}, PORT);
});

test("every event stays reachable when auth is off", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("public/ping")).toEqual({ pong: true });
  expect(await ws.sendAsync("admin/rebuild")).toEqual({ rebuilt: true });

  ws.close();
});

test("handlers get no identity when auth is off", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("whoami")).toBeNull();

  ws.close();
});

test("auth/ is not reserved when auth is off", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("auth/login", {}).catch(({ error }) => error)).toBe(
    "Unknown event: auth/login",
  );

  ws.close();
});
