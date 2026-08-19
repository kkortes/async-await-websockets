import sqlite from "./sqlite.js";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

const RESERVED = "aaw/";
const PROTECTED = "auth/";

export const reserved = (event) => event.startsWith(RESERVED);

export const guarded = (event) => event.startsWith(PROTECTED);

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
  const options = config === true ? {} : config;
  const {
    providers = ["sqlite"],
    database,
    session: { ttl: sessionTtl = 30 * DAY } = {},
    reset: { ttl: resetTtl = 20 * MINUTE } = {},
    onPasswordReset,
  } = options;

  const store = new Proxy(options.store ?? sqlite(database), {
    get: (target, method) =>
      target[method] ?? (() => { throw Error("Auth is not set up via aaw"); }),
  });

  const enabled = providers.map(named);
  const social = enabled.filter(({ name }) => name !== "sqlite");

  const start = async (ws, user) => {
    const token = await store.createSession(user, sessionTtl);

    ws.identity = user;
    ws.token = token;

    return { token, user };
  };

  const restore = async (ws, token) => {
    const user = await store.readSession(token);

    if (user) {
      ws.identity = user;
      ws.token = token;
    }

    return user;
  };

  const end = async (ws) => {
    ws.token && (await store.endSession(ws.token));

    ws.identity = undefined;
    ws.token = undefined;
  };

  const link = async (provider, request) => {
    const { subject, email } = await provider.callback(request);
    const user =
      (await store.findByProvider({ provider: provider.name, subject })) ??
      (email && (await store.findUser(email))) ??
      (await store.createUser({ email }));

    await store.linkProvider({ provider: provider.name, subject, user });

    const token = await store.createSession(user, sessionTtl);

    return Response.redirect(`${provider.redirect ?? "/"}#token=${token}`, 302);
  };

  return {
    store,

    http: (request) => {
      const { pathname } = new URL(request.url);
      const provider = social.find(({ name }) => pathname.startsWith(`/auth/${name}`));

      if (!provider) return;

      return pathname.endsWith("/callback") ? link(provider, request) : provider.start(request);
    },

    guard: (event, ws) => {
      if (!guarded(event)) return;
      if (!ws.identity) return "Not authenticated";
      if (!permitted(ws.identity.allowed, event)) return `Not allowed: ${event}`;
    },

    context: (ws) => ({
      identity: ws.identity,
      authenticate: (user) => start(ws, user),
      auth: {
        store,
        onPasswordReset,
        reset: (user) => store.createReset(user, resetTtl),
        session: {
          start: (user) => start(ws, user),
          restore: (token) => restore(ws, token),
          end: () => end(ws),
        },
      },
    }),
  };
};
