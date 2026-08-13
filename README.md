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
- ❌ Client authentication

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

`aaw(eventDir, services, port, log)`

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

Every `sendAsync` call gets its own request id and resolves only on the reply carrying that id. Concurrent calls to the same event therefore each receive their own result, and a server push (`ws.sendEvent` / `room.emit`) that happens to share the event name never resolves a pending request — it goes to `ws.on` subscribers, where it belongs. A reply that arrives after the timeout has already rejected is dropped.

## Wire protocol

Messages are JSON tuples.

- Request: `[event, payload]`, or `[event, payload, id]` when the client wants a correlated reply (this is what `sendAsync` sends; `sendSync` sends the two-element form).
- Reply: the server echoes the id it was given — `[event, result, id]`. A request without an id is answered with `[event, result]`, exactly as before.
- Push: `[event, data]` — server-initiated messages never carry an id, so the client always routes them to `ws.on`.

Ids are opaque strings; a client that never sends one keeps the original behavior, so old clients and new servers interoperate in both directions.

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
