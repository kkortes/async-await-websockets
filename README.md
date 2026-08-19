# aaw

![](https://wallpaperaccess.com/full/374183.jpg)

## Major update since v3.0.0+

Async-await-websockets is now running on Bun (https://bun.sh/). Until the most popular runtime hosts have support for Bun you'll have to run it on your own custom server _or_ in a docker container.

## async-await-websockets

- ✅ Uses native `websockets`
  - CLIENT (https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)
  - SERVER (https://github.com/websockets/ws)
- ✅ Enables `async/await` messaging from the client
- ✅ Broadcast messages
- ✅ Automatic reconnection
- ✅ Rooms — targeted multicast to named subsets of connections
- ✅ Client authentication (optional)

## How to create your own server

1. `mkdir my-server`
2. `cd my-server`
3. `bun init`
4. Add to package.json

```
"scripts": {
  "dev": "bun --watch index.js"
},
```

5. `bun install async-await-websockets`
6. Create `index.js` with contents:

```
import aaw from "async-await-websockets";

aaw("events");
```

7. `mkdir events`
8. `bun dev`

Your server should now be reachable on ws://localhost:1337

## Configuration

`aaw(eventDir, services, port, log, auth)`

### eventDir (string)

Name of directory that holds your socket events.

Default: `events`

### services (object)

Third party services that you need access to in your socket events (e.g. database connection). `ws` and `room` are always exposed and cannot be removed.

Default: `{ ws: [Websocket Object], room: [Room API] }`

### port (integer)

A port of your liking.

Default: `1337`

### log (function)

With the parameter signature `(event, websocketKey, async, error, body, result)` you can create custom server logging for all events called through `root`-directory.

Default: `undefined`

### auth (object | boolean)

Optional authentication. `false` (the default) leaves aaw a pure transport; `true` enables it
with the built-in SQLite store. See [Authentication](#authentication).

Default: `false`

## Your server

`aaw` returns an `Bun websocket`-instance (https://bun.sh/docs/api/websockets)

Each `.js` file in `events` is scanned and available with `ws.sendAsync('dir/file')`

This is the signature for any `.js` file within `events`:

```
export default async (body, services) => {
  const response = await services.mongo.insertSomething(body.id);
  services.ws.sendEvent('notify-about-insertion', { id: response.id });
  return response;
}
```

Omitting the `async` keyword will treat the event as a regular websocket event.

## Authentication

Off by default — aaw stays the transport it has always been. Switch it on with a fifth
argument and you get server-minted sessions, a folder convention for who may call what, and
a SQLite user store you never have to configure.

```js
aaw("events", { mongo }, 1337, log, true);
```

### The folder convention

With auth enabled, **events under `public/` are open and everything else needs a session.**
No per-file flag, no central policy list — where the file sits *is* the rule, the same way
its path is already its name.

```
events/public/health.js     → "public/health"   anyone
events/teamplay/chat.js     → "teamplay/chat"   needs a session
events/admin/reseed.js      → "admin/reseed"    needs a session
```

The default is deny because enabling auth is a statement that this server has users. A new
event file is protected the moment you create it; forgetting to mark something public fails
loudly, which is the direction worth failing in.

### Connecting

The connection itself is free — anyone may open a socket. What a token buys is the right to
call anything outside `public/`.

```js
import aaw from "@ape-egg/async-await-websockets/client.js";

const ws = aaw("wss://example.com");

await ws.login({ email, password });      // or ws.login(credentials, "auth/register")
await ws.sendAsync("teamplay/chat", { id, text });   // no token in the body
await ws.logout();
```

The session binds to the connection, so it is established once rather than re-proven on
every message. Handlers receive it as `identity`:

```js
export default async ({ id, text }, { identity, room }) => {
  room.emit(`teamplay:${id}`, "chat", { from: identity.email, text });
};
```

`ws.login` remembers the token and replays it after an automatic reconnect, before `open`
fires — so a first call made inside `open` cannot race a reconnect it never saw. If the
session has expired by then the client emits `unauthorized` instead.

Store the token yourself to survive a page reload:

```js
const ws = aaw("wss://example.com", { token: localStorage.token });
ws.on("unauthorized", () => delete localStorage.token);
```

### Built-in events

Reserved under `auth/` while authentication is on, and always reachable — a caller has to be
able to log in before it holds anything to log in with. An event file of your own that
collides with one of these stops the server at boot rather than being silently shadowed.

| Event | Does |
|---|---|
| `auth/register` | Create an account and bind a session |
| `auth/login` | Bind a session to this connection |
| `auth/resume` | Re-bind an existing token (what reconnects use) |
| `auth/logout` | End the session everywhere |
| `auth/password/request-reset` | Mint a reset token and hand it to `onReset` |
| `auth/password/set-new` | Consume a reset token and set a new password |

Reset tokens are `crypto.randomUUID()` with a real expiry, checked where the password
actually changes. Delivering one is your app's business, so aaw hands it over and stays out
of the mail:

```js
aaw("events", {}, 1337, undefined, {
  onReset: ({ user, token }) => sendMail(user.email, `${SITE}/reset#${token}`),
});
```

`request-reset` answers `{ ok: true }` for a known and an unknown address alike, so it
cannot be used to enumerate accounts. Passwords are hashed with `Bun.password` (Argon2id),
which is what makes a guessed password cost the attacker real CPU on every attempt.

### Permissions

An identity may carry `allowed` — globs matched against the event path. Without it, any
session may call any protected event.

```js
{ allowed: ["teamplay/*"] }   // a player
{ allowed: ["*"] }            // an admin
```

### Providers

`providers` defaults to `["sqlite"]`, aaw's built-in store. Naming any other provider turns
the built-in password login off unless you list it too.

```js
aaw("events", {}, 1337, undefined, {
  providers: ["sqlite", { name: "google", clientId, clientSecret, start, callback }],
});
```

A social provider redirects a browser, so it arrives over HTTP rather than the socket — the
only reason aaw ever answers a plain request. aaw owns the session half (find or create the
user, link `provider` + `subject`, mint a token, redirect back with it in the URL fragment);
a provider owns the handshake half, as two functions:

```js
{
  name: "google",
  redirect: "/",                                  // token arrives as #token=…
  start: (request) => Response.redirect(authorizeUrl, 302),
  callback: async (request) => ({ subject, email }),   // verified profile
}
```

**No OAuth provider ships yet** — the store, the routes and the contract are in place so one
can be added as a small module, and so social login does not need a schema change later.

### Bringing your own store

The SQLite store is a default, not a requirement. Pass `store` and aaw never opens a
database — useful when users already live in mongo, or when "users" are API keys in a
committed file.

```js
aaw("events", { mongo }, 1337, undefined, {
  store: {
    findUser: (email) => …,
    verify: async (email, password) => identity | null,
    createSession: (user, ttl) => token,
    readSession: (token) => identity | null,
    endSession: (token) => …,
  },
});
```

Your own login event can bind a session directly, for credentials aaw knows nothing about:

```js
export default async ({ license }, { authenticate }) =>
  authenticate(await lookupByLicense(license));
```

## Rooms

Every event handler receives a `room` API alongside `ws`. Rooms are named subsets of connections you can multicast to — useful for chat channels, game lobbies, or any group of clients that should receive the same event. Membership is per-connection and clears automatically when a client disconnects.

```
export default (body, { ws, room }) => {
  room.join(body.channel);
  room.emit(body.channel, 'joined', { id: ws.data }, ws);
};
```

### `room` API

- `room.join(name)` — add the current connection to room `name` (created on demand).
- `room.leave(name)` — remove the current connection from room `name` (room is deleted when empty).
- `room.emit(name, event, data, except?)` — send `[event, data]` to every member of `name`, optionally skipping one connection (e.g. pass `ws` to exclude the sender). Returns the number of clients sent to.
- `room.size(name)` — number of connections currently in room `name`.

`emit` is connection-agnostic, so a later callback (e.g. a timer) can multicast to a room after the triggering message has resolved.

## Your client

`npm install async-await-websockets`

```
import aaw from 'async-await-websockets';

const ws = aaw('wss://websocket-server.url:1337');

ws.on('open', () => {
  (async () => {
    try {
      const result = await ws.sendAsync('example-async', { somedata: "for the backend" });
      console.info(result);
    } catch ({ error }) {
      console.error(error);
    }
  })();
});
```

### `ws.sendAsync` parameters:

- `event name` (string, required)
- `payload` (any, default `undefined`)
- `timeout in ms` (integer, default `3000`)

## Error handling

When calling `ws.sendAsync('some-event')` there are two possible failures:

1. The call to your socket server timed out (happens on the client).
2. The server threw an error because something went wrong.

In both cases `sendAsync` will throw an object that contains an error-message like so:

```
{
  error: "What went wrong"
}
```

## Publishing

- `bun run publish:check` — dry-run `npm pack` to preview the published tarball.
- `bun run publish` — runs the check, prompts for a new version (or keeps the current one), and publishes `@ape-egg/async-await-websockets` to npm.

Use `bun run publish` (not `bun publish`, which is Bun's own built-in publisher and skips the script). Requires being logged in to npm (`npm login`).
