import { afterAll, beforeAll, expect, test } from "bun:test";

import aaw from "../server.js";
import { clearDatabase, connect, rejection, root } from "./helpers.js";

const PORT = 1352;
const DATABASE = "tests/auth.test.sqlite";

let lastReset;

beforeAll(async () => {
  root();
  clearDatabase(DATABASE);
  await aaw("tests/events", {}, PORT, undefined, {
    providers: ["sqlite"],
    database: DATABASE,
    onPasswordReset: ({ token }) => (lastReset = token),
  });
});

afterAll(() => clearDatabase(DATABASE));

const register = (socket, email, password = "hunter2") =>
  socket.sendAsync("aaw/register", { email, password });

const login = (socket, password = "hunter2") =>
  socket.sendAsync("aaw/login", { email: "a@example.com", password });

test("events outside auth/ are reachable without a session", async () => {
  const ws = await connect(PORT);

  expect(await ws.sendAsync("ping")).toEqual({ pong: true });

  ws.close();
});

test("events under auth/ are refused without a session", async () => {
  const ws = await connect(PORT);

  expect(await rejection(ws.sendAsync("auth/whoami"))).toBe("Not authenticated");
  expect(await rejection(ws.sendAsync("auth/admin/rebuild"))).toBe("Not authenticated");

  ws.close();
});

test("register binds a session to the connection", async () => {
  const ws = await connect(PORT);
  const { token, user } = await register(ws, "a@example.com");

  expect(token).toMatch(/^[0-9a-f-]{36}$/);
  expect(user.email).toBe("a@example.com");
  expect((await ws.sendAsync("auth/whoami")).email).toBe("a@example.com");

  ws.close();
});

test("the identity never carries the password hash", async () => {
  const ws = await connect(PORT);

  await ws.sendAsync("aaw/login", { email: "a@example.com", password: "hunter2" });

  expect(await ws.sendAsync("auth/whoami")).toEqual({
    id: expect.any(String),
    email: "a@example.com",
  });

  ws.close();
});

test("the token is minted by the server, not taken from the client", async () => {
  const ws = await connect(PORT);
  const { token } = await ws.sendAsync("aaw/login", {
    email: "a@example.com",
    password: "hunter2",
  });

  expect(token).not.toBe(ws.protocol);

  ws.close();
});

test("a wrong password is refused and leaves the connection anonymous", async () => {
  const ws = await connect(PORT);

  expect(
    await rejection(ws.sendAsync("aaw/login", { email: "a@example.com", password: "no" })),
  ).toBe("Invalid credentials");
  expect(await rejection(ws.sendAsync("auth/whoami"))).toBe("Not authenticated");

  ws.close();
});

test("registering an email twice is refused", async () => {
  const ws = await connect(PORT);

  expect(await rejection(register(ws, "a@example.com"))).toBe("Email already registered");

  ws.close();
});

test("a session resumes on a brand new connection", async () => {
  const first = await connect(PORT);
  const { token } = await login(first);
  first.close();

  const second = await connect(PORT, { token });

  expect((await second.sendAsync("auth/whoami")).email).toBe("a@example.com");

  second.close();
});

test("an expired or unknown token leaves the connection anonymous", async () => {
  const socket = await connect(PORT, { token: "not-a-real-token" });

  expect(await rejection(socket.sendAsync("auth/whoami"))).toBe("Not authenticated");

  socket.close();
});

test("logout ends the session for every future connection", async () => {
  const socket = await connect(PORT);
  const { token } = await login(socket);

  await socket.sendAsync("aaw/logout");

  expect(await rejection(socket.sendAsync("auth/whoami"))).toBe("Not authenticated");

  const next = await connect(PORT);

  expect(await rejection(next.sendAsync("aaw/resume", { token }))).toBe("Session expired");

  socket.close();
  next.close();
});

test("two clients in one process keep their own session", async () => {
  const anonymous = await connect(PORT);
  const member = await connect(PORT);

  await login(member);

  expect((await member.sendAsync("auth/whoami")).email).toBe("a@example.com");
  expect(await rejection(anonymous.sendAsync("auth/whoami"))).toBe("Not authenticated");

  anonymous.close();
  member.close();
});

test("a reset token is random, single use, and replaces the password", async () => {
  const socket = await connect(PORT);

  await socket.sendAsync("aaw/password/request-reset", { email: "a@example.com" });

  expect(lastReset).toMatch(/^[0-9a-f-]{36}$/);

  await socket.sendAsync("aaw/password/set-new", { token: lastReset, password: "hunter3" });

  expect(
    await rejection(
      socket.sendAsync("aaw/password/set-new", { token: lastReset, password: "hunter4" }),
    ),
  ).toBe("Reset link is invalid or expired");

  const after = await connect(PORT);

  expect(
    (await after.sendAsync("aaw/login", { email: "a@example.com", password: "hunter3" })).user
      .email,
  ).toBe("a@example.com");
  expect(
    await rejection(
      after.sendAsync("aaw/login", { email: "a@example.com", password: "hunter2" }),
    ),
  ).toBe("Invalid credentials");

  socket.close();
  after.close();
});

test("requesting a reset for an unknown email answers the same as a known one", async () => {
  const socket = await connect(PORT);

  expect(await socket.sendAsync("aaw/password/request-reset", { email: "nobody@example.com" }))
    .toEqual({ ok: true });

  socket.close();
});
