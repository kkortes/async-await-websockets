import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { connect, rejection, root } from "./helpers.js";

const PORT = 1356;

beforeAll(async () => {
  root();
  await aaw("tests/events", {}, PORT);
});

test("events outside auth/ stay reachable when auth is off", async () => {
  const socket = await connect(PORT);

  expect(await socket.sendAsync("ping")).toEqual({ pong: true });

  socket.close();
});

test("handlers get no identity when auth is off", async () => {
  const socket = await connect(PORT);

  expect(await socket.sendAsync("context")).toEqual({ identity: null });

  socket.close();
});

test("auth/ events are unreachable rather than open when auth is off", async () => {
  const socket = await connect(PORT);

  expect(await rejection(socket.sendAsync("auth/whoami"))).toBe(
    "Authentication is not enabled — auth/whoami is unreachable",
  );
  expect(await rejection(socket.sendAsync("auth/admin/rebuild"))).toBe(
    "Authentication is not enabled — auth/admin/rebuild is unreachable",
  );

  socket.close();
});

test("aaw's own events are not registered when auth is off", async () => {
  const socket = await connect(PORT);

  expect(await rejection(socket.sendAsync("aaw/login", {}))).toBe("Unknown event: aaw/login");

  socket.close();
});
