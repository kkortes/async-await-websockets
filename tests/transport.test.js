import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import client from "../client.js";

const PORT = 1340;

const connect = () => {
  const ws = client(`ws://localhost:${PORT}`);
  return new Promise((resolve) => ws.addEventListener("open", () => resolve(ws)));
};

const rejection = (promise) => promise.then(() => null).catch(({ error }) => error);

// Auth is opt-in: without it aaw stays the transport it has always been.
beforeAll(async () => {
  process.chdir(import.meta.dir.replace(/\/tests$/, ""));
  await aaw("tests/events", {}, PORT);
});

test("events outside auth/ stay reachable when auth is off", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("ping")).toEqual({ pong: true });

  ws.close();
});

test("handlers get no identity when auth is off", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("context")).toEqual({ identity: null });

  ws.close();
});

// Leaving auth off must never be the thing that exposes a protected event.
test("auth/ events are unreachable rather than open when auth is off", async () => {
  const ws = await connect();

  expect(await rejection(ws.sendAsync("auth/whoami"))).toBe(
    "Authentication is not enabled — auth/whoami is unreachable",
  );
  expect(await rejection(ws.sendAsync("auth/admin/rebuild"))).toBe(
    "Authentication is not enabled — auth/admin/rebuild is unreachable",
  );

  ws.close();
});

test("aaw/ is not reserved when auth is off", async () => {
  const ws = await connect();

  expect(await rejection(ws.sendAsync("aaw/login", {}))).toBe("Unknown event: aaw/login");

  ws.close();
});
