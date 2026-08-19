import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { awaited, connect, rejection, root } from "./helpers.js";

const PORT = 1350;

beforeAll(async () => {
  root();
  await aaw("tests/events", { db: "injected" }, PORT);
});

test("aaw() returns the Bun server", async () => {
  const server = await aaw("tests/events", {}, 1359);

  expect(server.port).toBe(1359);

  server.stop(true);
});

test("an async event resolves with what it returns", async () => {
  const ws = await connect(PORT);

  expect(await ws.sendAsync("ping")).toEqual({ pong: true });

  ws.close();
});

test("a nested file is addressed by its path", async () => {
  const ws = await connect(PORT);

  expect(await ws.sendAsync("subdir/nested")).toEqual({ nested: true });

  ws.close();
});

test("the body reaches the handler", async () => {
  const ws = await connect(PORT);

  expect(await ws.sendAsync("echo", { a: 1, b: [2, 3] })).toEqual({
    received: { a: 1, b: [2, 3] },
  });

  ws.close();
});

test("a missing body becomes an empty object", async () => {
  const ws = await connect(PORT);

  expect(await ws.sendAsync("echo")).toEqual({ received: {} });

  ws.close();
});

test("services are injected alongside ws and room", async () => {
  const ws = await connect(PORT);

  expect((await ws.sendAsync("services")).keys).toEqual(["db", "room", "ws"]);

  ws.close();
});

test("an unknown event answers with an error", async () => {
  const ws = await connect(PORT);

  expect(await rejection(ws.sendAsync("nope"))).toBe("Unknown event: nope");

  ws.close();
});

test("a thrown error arrives as its message, without an Error prefix", async () => {
  const ws = await connect(PORT);

  expect(await rejection(ws.sendAsync("explode"))).toBe("Something went wrong");

  ws.close();
});

test("a sync event does not reply, so sendAsync times out", async () => {
  const ws = await connect(PORT);

  expect(await rejection(ws.sendAsync("notify", {}, 100))).toBe(
    "WebSocket error (client): request timed out",
  );

  ws.close();
});

test("a sync event can push an event of its own", async () => {
  const ws = await connect(PORT);
  const notified = awaited(ws, "notified");

  ws.sendSync("notify", { hello: true });

  expect(await notified).toEqual({ seen: { hello: true } });

  ws.close();
});

test("broadcast reaches other clients but not the sender", async () => {
  const sender = await connect(PORT);
  const listener = await connect(PORT);

  const heard = awaited(listener, "broadcast");
  const silent = awaited(sender, "broadcast", 200).then(
    () => "sender heard it",
    () => "sender stayed silent",
  );

  sender.sendSync("announce", { news: true });

  expect(await heard).toEqual({ news: true });
  expect(await silent).toBe("sender stayed silent");

  sender.close();
  listener.close();
});

test("two clients in one process do not resolve each other's calls", async () => {
  const one = await connect(PORT);
  const two = await connect(PORT);

  const [a, b] = await Promise.all([
    one.sendAsync("echo", { from: "one" }),
    two.sendAsync("echo", { from: "two" }),
  ]);

  expect(a).toEqual({ received: { from: "one" } });
  expect(b).toEqual({ received: { from: "two" } });

  one.close();
  two.close();
});
