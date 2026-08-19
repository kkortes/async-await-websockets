import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { awaited, connect, root } from "./helpers.js";

const PORT = 1351;

beforeAll(async () => {
  root();
  await aaw("tests/events", {}, PORT);
});

test("a room multicasts to its members and skips the sender", async () => {
  const speaker = await connect(PORT);
  const listener = await connect(PORT);

  speaker.sendSync("room/join", { name: "lobby" });
  listener.sendSync("room/join", { name: "lobby" });

  const heard = awaited(listener, "said");
  const silent = awaited(speaker, "said", 200).then(
    () => "speaker heard it",
    () => "speaker stayed silent",
  );

  speaker.sendSync("room/say", { name: "lobby", text: "hello" });

  expect(await heard).toEqual({ text: "hello" });
  expect(await silent).toBe("speaker stayed silent");

  speaker.close();
  listener.close();
});

test("a non-member never hears the room", async () => {
  const member = await connect(PORT);
  const outsider = await connect(PORT);

  member.sendSync("room/join", { name: "private" });

  const silent = awaited(outsider, "said", 200).then(
    () => "outsider heard it",
    () => "outsider stayed out",
  );

  member.sendSync("room/say", { name: "private", text: "secret" });

  expect(await silent).toBe("outsider stayed out");

  member.close();
  outsider.close();
});

test("membership is counted and released on leave", async () => {
  const ws = await connect(PORT);

  ws.sendSync("room/join", { name: "counted" });

  expect(await ws.sendAsync("room/size", { name: "counted" })).toEqual({ size: 1 });

  ws.sendSync("room/leave", { name: "counted" });

  expect(await ws.sendAsync("room/size", { name: "counted" })).toEqual({ size: 0 });

  ws.close();
});

test("membership clears when the connection drops", async () => {
  const leaver = await connect(PORT);
  const observer = await connect(PORT);

  leaver.sendSync("room/join", { name: "transient" });

  expect(await observer.sendAsync("room/size", { name: "transient" })).toEqual({ size: 1 });

  leaver.close();
  await Bun.sleep(100);

  expect(await observer.sendAsync("room/size", { name: "transient" })).toEqual({ size: 0 });

  observer.close();
});

test("an unknown room is empty rather than an error", async () => {
  const ws = await connect(PORT);

  expect(await ws.sendAsync("room/size", { name: "nothing" })).toEqual({ size: 0 });

  ws.close();
});
