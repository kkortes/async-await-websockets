import sqlite from "./sqlite.js";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

// aaw's own events. Reserved while auth is enabled, and never gated — a caller
// has to be able to log in before it holds anything to log in with, which is
// also why they cannot live under auth/ themselves.
const RESERVED = "aaw/";

// The folder convention: events under auth/ require a session, everything else
// is open.
const PROTECTED = "auth/";

export const reserved = (event) => event.startsWith(RESERVED);

export const guarded = (event) => event.startsWith(PROTECTED);

// An identity may carry `allowed` globs, matched against the event path — the
// same shape belt gives an API key, so "which identity" needs no second concept.
const permitted = (allowed, event) =>
  !allowed ||
  allowed.some(
    (pattern) =>
      pattern === "*" ||
      pattern === event ||
      (pattern.endsWith("/*") && event.startsWith(pattern.slice(0, -1))),
  );

const named = (provider) => (typeof provider === "string" ? { name: provider } : provider);

export default (config) => {
  const {
    providers = ["sqlite"],
    database,
    store = sqlite(database),
    session: { ttl: sessionTtl = 30 * DAY } = {},
    reset: { ttl: resetTtl = 20 * MINUTE } = {},
    onReset,
  } = config === true ? {} : config;

  const enabled = providers.map(named);
  const passwords = enabled.find(({ name }) => name === "sqlite");
  const social = enabled.filter(({ name }) => name !== "sqlite");

  const requirePasswords = () => {
    if (!passwords) throw Error("Password login is not an enabled provider");
  };

  const bind = async (ws, user) => {
    const token = await store.createSession(user, sessionTtl);

    ws.identity = user;
    ws.token = token;

    return { token, user };
  };

  const events = {
    "aaw/register": async ({ email, password }, { ws }) => {
      requirePasswords();

      if (!email || !password) throw Error("Email and password are required");
      if (await store.findUser(email)) throw Error("Email already registered");

      return bind(ws, await store.createUser({ email, password }));
    },

    "aaw/login": async ({ email, password }, { ws }) => {
      requirePasswords();

      const user = await store.verify(email, password);

      if (!user) throw Error("Invalid credentials");

      return bind(ws, user);
    },

    // What the client replays after an automatic reconnect, and what a browser
    // calls with the token an OAuth callback handed it.
    "aaw/resume": async ({ token }, { ws }) => {
      const user = await store.readSession(token);

      if (!user) throw Error("Session expired");

      ws.identity = user;
      ws.token = token;

      return { token, user };
    },

    "aaw/logout": async (_, { ws }) => {
      ws.token && (await store.endSession(ws.token));

      ws.identity = undefined;
      ws.token = undefined;

      return { ok: true };
    },

    // The token is random and expires. Delivering it is the app's business, so
    // aaw hands it to `onReset` and stays out of the mail.
    "aaw/password/request-reset": async ({ email }) => {
      requirePasswords();

      const user = await store.findUser(email);

      if (user) await onReset?.({ user, token: await store.createReset(user, resetTtl) });

      // The same answer either way, so this cannot be used to enumerate accounts.
      return { ok: true };
    },

    "aaw/password/set-new": async ({ token, password }, { ws }) => {
      requirePasswords();

      if (!password) throw Error("A new password is required");

      const user = await store.consumeReset(token, password);

      if (!user) throw Error("Reset link is invalid or expired");

      return bind(ws, user);
    },
  };

  // Social providers redirect a browser, so they arrive over HTTP rather than
  // the socket. aaw owns the session half; a provider owns the handshake half.
  const complete = async (provider, request) => {
    const { subject, email } = await provider.callback(request);
    // An address already registered here is the same person, so the provider is
    // linked to that account rather than colliding with it — which holds only
    // because `callback` is required to return an address the provider verified.
    const user =
      (await store.findByProvider({ provider: provider.name, subject })) ??
      (email && (await store.findUser(email))) ??
      (await store.createUser({ email }));

    await store.linkProvider({ provider: provider.name, subject, user });

    const token = await store.createSession(user, sessionTtl);

    return Response.redirect(`${provider.redirect ?? "/"}#token=${token}`, 302);
  };

  return {
    events,

    store,

    http: (request) => {
      const { pathname } = new URL(request.url);
      const provider = social.find(({ name }) => pathname.startsWith(`/auth/${name}`));

      if (!provider) return;

      return pathname.endsWith("/callback") ? complete(provider, request) : provider.start(request);
    },

    guard: (event, ws) => {
      if (!guarded(event)) return;
      if (!ws.identity) return "Not authenticated";
      if (!permitted(ws.identity.allowed, event)) return `Not allowed: ${event}`;
    },

    context: (ws) => ({
      identity: ws.identity,
      // What a consumer's own login event calls when it brings its own user store.
      authenticate: (user) => bind(ws, user),
    }),
  };
};
