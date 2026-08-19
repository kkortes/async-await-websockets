import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { connect, rejection, root } from "./helpers.js";

const PORT = 1357;
const entries = [];

beforeAll(async () => {
  root();
  await aaw("tests/events", {}, PORT, (entry) => entries.push(entry));
});

test("a successful call is logged with its result", async () => {
  const ws = await connect(PORT);

  await ws.sendAsync("ping");
  await Bun.sleep(50);

  const entry = entries.find(({ event }) => event === "ping");

  expect(entry.async).toBe(true);
  expect(entry.result).toEqual({ pong: true });
  expect(entry.error).toBeUndefined();
  expect(entry.websocketKey).toMatch(/^_/);

  ws.close();
});

test("a failed call is logged with its error", async () => {
  const ws = await connect(PORT);

  await rejection(ws.sendAsync("explode"));
  await Bun.sleep(50);

  const entry = entries.find(({ event }) => event === "explode");

  expect(entry.error).toBe("Something went wrong");
  expect(entry.result).toBeUndefined();

  ws.close();
});

test("a sync event is logged as not async", async () => {
  const ws = await connect(PORT);

  ws.sendSync("notify", { hello: true });
  await Bun.sleep(50);

  const entry = entries.find(({ event }) => event === "notify");

  expect(entry.async).toBe(false);
  expect(entry.body).toEqual({ hello: true });

  ws.close();
});
