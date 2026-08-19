import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import client from "../client.js";

const PORT = 1341;

// A bring-your-own store — what belt would pass to keep its committed key file,
// and what battleborn would pass to keep its users in mongo.
const USERS = {
  "admin@example.com": { id: "1", email: "admin@example.com", allowed: ["*"] },
  "bot@example.com": { id: "2", email: "bot@example.com", allowed: ["admin/*"] },
};

const sessions = new Map();

const store = {
  findUser: (email) => USERS[email] ?? null,
  verify: async (email, password) => (password === "secret" ? USERS[email] : null),
  createSession: (user) => {
    const token = crypto.randomUUID();
    sessions.set(token, user);
    return token;
  },
  readSession: (token) => sessions.get(token) ?? null,
  endSession: (token) => sessions.delete(token),
};

const connect = () => {
  const ws = client(`ws://localhost:${PORT}`);
  return new Promise((resolve) => ws.addEventListener("open", () => resolve(ws)));
};

const rejection = (promise) => promise.then(() => null).catch(({ error }) => error);

beforeAll(async () => {
  process.chdir(import.meta.dir.replace(/\/tests$/, ""));
  await aaw("tests/events", {}, PORT, undefined, { store });
});

test("a custom store authenticates without aaw's sqlite", async () => {
  const ws = await connect();

  expect((await ws.login({ email: "admin@example.com", password: "secret" })).user.id).toBe("1");
  expect((await ws.sendAsync("whoami")).email).toBe("admin@example.com");

  ws.close();
});

test("`allowed` globs are matched against the event path", async () => {
  const ws = await connect();

  await ws.login({ email: "bot@example.com", password: "secret" });

  expect(await ws.sendAsync("admin/rebuild")).toEqual({ rebuilt: true });
  expect(await rejection(ws.sendAsync("whoami"))).toBe("Not allowed: whoami");

  ws.close();
});

test("`*` allows everything", async () => {
  const ws = await connect();

  await ws.login({ email: "admin@example.com", password: "secret" });

  expect(await ws.sendAsync("admin/rebuild")).toEqual({ rebuilt: true });
  expect((await ws.sendAsync("whoami")).id).toBe("1");

  ws.close();
});
