import { beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { connect, rejection, root } from "./helpers.js";

const PORT = 1353;

const USERS = {
  "admin@example.com": { id: "1", email: "admin@example.com", allowed: ["*"] },
  "bot@example.com": { id: "2", email: "bot@example.com", allowed: ["auth/admin/*"] },
  "plain@example.com": { id: "3", email: "plain@example.com" },
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

const login = (socket, email) => socket.sendAsync("aaw/login", { email, password: "secret" });

beforeAll(async () => {
  root();
  await aaw("tests/events", {}, PORT, undefined, { store });
});

test("a custom store authenticates without aaw ever opening sqlite", async () => {
  const socket = await connect(PORT);

  expect((await login(socket, "admin@example.com")).user.id).toBe("1");
  expect((await socket.sendAsync("auth/whoami")).email).toBe("admin@example.com");

  socket.close();
});

test("allowed globs are matched against the event path", async () => {
  const socket = await connect(PORT);

  await login(socket, "bot@example.com");

  expect(await socket.sendAsync("auth/admin/rebuild")).toEqual({ rebuilt: true });
  expect(await rejection(socket.sendAsync("auth/whoami"))).toBe("Not allowed: auth/whoami");

  socket.close();
});

test("a star allows everything", async () => {
  const socket = await connect(PORT);

  await login(socket, "admin@example.com");

  expect(await socket.sendAsync("auth/admin/rebuild")).toEqual({ rebuilt: true });
  expect((await socket.sendAsync("auth/whoami")).id).toBe("1");

  socket.close();
});

test("an identity without allowed may call any protected event", async () => {
  const socket = await connect(PORT);

  await login(socket, "plain@example.com");

  expect(await socket.sendAsync("auth/admin/rebuild")).toEqual({ rebuilt: true });
  expect((await socket.sendAsync("auth/whoami")).id).toBe("3");

  socket.close();
});
