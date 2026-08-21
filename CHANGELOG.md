# Changelog

All notable changes to this project are documented here. This project adheres to [Semantic Versioning](https://semver.org/).

## [3.3.0]

### Added

- **A documentation one-pager** (`index.html`, published at [aaw.korte.kim](https://aaw.korte.kim)) covering the transport, rooms and authentication. It is not part of the npm tarball.

### Changed

- **A refused `sendAsync` now rejects with an `Error`.** Both rejection paths — the server's error reply and the client-side timeout — previously threw a bare object, which prints as `#<Object>` in a browser console or a log: no message, no stack, nothing to act on. Every field the server sent is copied onto the error, so consumers reading `refusal.error` are unaffected and `.message` and `.stack` now work as expected.
- **The publish script is now `bun run release`.** npm re-runs a script named `publish` as a lifecycle hook after `npm publish` succeeds, so the old name published the package a second time and failed the run on the duplicate version.

## [3.2.1]

### Fixed

- **A throwing synchronous handler no longer kills the server.** The handler was invoked outside the try/catch, so an ordinary validation guard such as `if (!body.id) throw Error(...)` escaped Bun's message callback and terminated the process — any client sending an incomplete body could stop the server.
- **A malformed frame no longer kills the server.** `JSON.parse` and the destructuring ran outside any try, so a frame that was not valid JSON, or valid JSON that was not an `[event, body]` pair, terminated the process. Such a frame carries no event to answer, so it is dropped.
- **A prototype-chain event name is an unknown event, not a crash.** Looking the event up with `endpoints?.[event]` matched inherited members, so an event named `constructor` or `toString` resolved to a function that was never a handler; the lookup is now an own-property check.
- **Sends follow the live socket across a reconnect.** `sendSync` and `sendAsync` captured the socket they were created with, so calls made after an automatic reconnect went to the dead one.
- **An error with an empty message still rejects the caller.** `err.message ?? String(err)` left an empty string for `throw Error()`, which read as falsy at the send site and shipped the failure as a successful `null`.
- **A failed resume clears the socket's identity**, rather than leaving the previous identity bound to the connection.
- **A built-in that needs a store method the configured store does not implement** answers `Auth is not set up via aaw` instead of exposing the missing internal call.

## [3.2.0]

### Added

- **Optional authentication** — off by default; aaw is unchanged unless you pass the new fifth `auth` argument.
  - **Folder convention** — events under `auth/` require a session, everything else is open. Where the file sits is the rule; there is no per-file flag and no central policy list.
  - **Turning auth off does not open `auth/` events** — they become unreachable, listed at boot and refused with `Authentication is not enabled — <event> is unreachable`. Leaving auth unconfigured can never be the thing that exposes a protected event.
  - **Server-minted sessions** bound to the connection. Identity is established once, not re-proven in every message body, and handlers receive it as `identity`.
  - **Built-in SQLite store** (`bun:sqlite`, no new dependency) holding users, linked providers, sessions and password resets. Passwords are hashed with `Bun.password` (Argon2id).
  - **`aaw/*` events** — `register`, `login`, `resume`, `logout`, `password/request-reset`, `password/set-new`. They live in the package's own `events/aaw/` folder as ordinary event files, named by their path exactly like yours, and registered alongside yours when auth is on. They sit outside `auth/` because a caller has to be able to log in before it holds anything to log in with. Reserved while auth is on; an event file that collides stops the server at boot instead of being silently shadowed.
  - A built-in that needs a store method the configured store does not implement answers `Auth is not set up via aaw`, rather than exposing the missing internal call.
  - **Reset tokens** are `crypto.randomUUID()` with an expiry enforced where the password actually changes. `request-reset` answers identically for known and unknown addresses, so it cannot enumerate accounts.
  - **`allowed` globs** on an identity, matched against the event path (`*`, `auth/teamplay/*`, an exact path).
  - **Bring your own store** — pass `store` and aaw never opens a database. `authenticate(user)` in the handler context binds a session for credentials aaw knows nothing about.
  - **Room for social providers** — provider registry, the `providers` link table, and an HTTP route pair (`/auth/<name>` and its callback) that mints a session and redirects back with the token. No OAuth provider ships yet.
- The client keeps the token from aaw's own session events and replays it after an automatic reconnect, before `open` fires, so a first call made inside `open` cannot race a reconnect it never saw. An expired session emits `unauthorized` instead. There is no separate login API — `aaw/login` and friends are called through `sendAsync` like any other event, so nothing auth-shaped appears on a client talking to a server that has auth off.
- `aaw()` now returns the Bun server instance, as the README has always claimed.

### Fixed

- **Two clients in one process no longer cross-resolve each other's `sendAsync` calls.** The client's `EventTarget` was module-scoped and shared by every connection; it is now per client and carried across internal reconnects.
- Passing `options` to the client without `reconnectInterval` no longer reconnects on a 0ms timer.

### Changed

- **Breaking:** `auth/` is now a reserved namespace. An event under an `auth/` folder requires a session, and with auth off it is unreachable rather than public (refused with `Authentication is not enabled — <event> is unreachable`). An existing app that already used an `events/auth/` folder for something else — an OAuth callback, a webhook — must move those events out of `auth/` or turn auth on. The events are listed at boot so the break is visible before a caller hits it.
- **Breaking:** a thrown handler error now sends `err.message` rather than `err.toString()`. The payload field is already named `error`, so the old shape prefixed every message with `"Error: "` — visible to end users wherever the string is displayed directly. Consumers that stripped the prefix should stop; consumers that displayed it raw get a cleaner message for free.

## [3.1.0]

### Added

- **Rooms** — a `room` API exposed in every event handler's context for targeted multicast to named subsets of connections. Membership is per-connection and clears automatically on disconnect.
  - `room.join(name)` / `room.leave(name)` — manage membership.
  - `room.emit(name, event, data, except?)` — multicast to a room, optionally excluding one connection; returns the number of clients sent to.
  - `room.size(name)` — current member count.

## [3.0.7]

### Changed

- Scoped the package as `@ape-egg/async-await-websockets`.

## [3.0.0]

### Changed

- Now running on [Bun](https://bun.sh/) instead of Node.
