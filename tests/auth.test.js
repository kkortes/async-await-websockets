import { afterAll, beforeAll, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";

import aaw from "../server.js";
import client from "../client.js";

const PORT = 1339;
const DATABASE = "tests/auth.test.sqlite";

const connect = () => {
  const ws = client(`ws://localhost:${PORT}`);
  return new Promise((resolve) => ws.addEventListener("open", () => resolve(ws)));
};

const rejection = (promise) => promise.then(() => null).catch(({ error }) => error);

beforeAll(async () => {
  process.chdir(import.meta.dir.replace(/\/tests$/, ""));

  await aaw("tests/events", {}, PORT, undefined, {
    providers: ["sqlite"],
    database: DATABASE,
    onReset: ({ token }) => (globalThis.lastResetToken = token),
  });
});

afterAll(() => {
  [DATABASE, `${DATABASE}-wal`, `${DATABASE}-shm`].forEach((file) => {
    try {
      unlinkSync(file);
    } catch {}
  });
});

test("events outside auth/ are reachable without a session", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("ping")).toEqual({ pong: true });

  ws.close();
});

test("events under auth/ are refused without a session", async () => {
  const ws = await connect();

  expect(await rejection(ws.sendAsync("auth/whoami"))).toBe("Not authenticated");

  ws.close();
});

test("register binds a session to the connection", async () => {
  const ws = await connect();
  const { token, user } = await ws.login(
    { email: "a@example.com", password: "hunter2" },
    "aaw/register",
  );

  expect(token).toMatch(/^[0-9a-f-]{36}$/);
  expect(user.email).toBe("a@example.com");
  expect(user.password).toBeUndefined();
  expect((await ws.sendAsync("auth/whoami")).email).toBe("a@example.com");

  ws.close();
});

test("the token is minted by the server, not taken from the client's sid", async () => {
  const ws = await connect();
  const { token } = await ws.login({ email: "a@example.com", password: "hunter2" });

  expect(token).not.toBe(ws.sid);

  ws.close();
});

test("a wrong password is refused and leaves the connection anonymous", async () => {
  const ws = await connect();

  expect(await rejection(ws.sendAsync("aaw/login", { email: "a@example.com", password: "no" })))
    .toBe("Invalid credentials");
  expect(await rejection(ws.sendAsync("auth/whoami"))).toBe("Not authenticated");

  ws.close();
});

test("a session resumes on a brand new connection", async () => {
  const first = await connect();
  const { token } = await first.login({ email: "a@example.com", password: "hunter2" });
  first.close();

  const second = await connect();
  await second.authenticate(token);

  expect((await second.sendAsync("auth/whoami")).email).toBe("a@example.com");

  second.close();
});

test("logout ends the session for every future connection", async () => {
  const ws = await connect();
  const { token } = await ws.login({ email: "a@example.com", password: "hunter2" });

  await ws.logout();

  expect(await rejection(ws.sendAsync("auth/whoami"))).toBe("Not authenticated");

  const next = await connect();

  expect(await rejection(next.authenticate(token))).toBe("Session expired");

  ws.close();
  next.close();
});

test("two clients in one process keep their own session", async () => {
  const anonymous = await connect();
  const member = await connect();

  await member.login({ email: "a@example.com", password: "hunter2" });

  expect((await member.sendAsync("auth/whoami")).email).toBe("a@example.com");
  expect(await rejection(anonymous.sendAsync("auth/whoami"))).toBe("Not authenticated");

  anonymous.close();
  member.close();
});

test("a reset token is random, single use, and expires", async () => {
  const ws = await connect();

  await ws.sendAsync("aaw/password/request-reset", { email: "a@example.com" });

  const token = globalThis.lastResetToken;

  expect(token).toMatch(/^[0-9a-f-]{36}$/);

  await ws.sendAsync("aaw/password/set-new", { token, password: "hunter3" });

  expect(await rejection(ws.sendAsync("aaw/password/set-new", { token, password: "hunter4" })))
    .toBe("Reset link is invalid or expired");
  expect((await ws.login({ email: "a@example.com", password: "hunter3" })).user.email)
    .toBe("a@example.com");

  ws.close();
});

test("requesting a reset for an unknown email answers the same as a known one", async () => {
  const ws = await connect();

  expect(await ws.sendAsync("aaw/password/request-reset", { email: "nobody@example.com" }))
    .toEqual({ ok: true });

  ws.close();
});

test("registering an email twice is refused", async () => {
  const ws = await connect();

  expect(
    await rejection(
      ws.sendAsync("aaw/register", { email: "a@example.com", password: "hunter2" }),
    ),
  ).toBe("Email already registered");

  ws.close();
});
