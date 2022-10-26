# aaw

![](https://wallpaperaccess.com/full/374183.jpg)

## async-await-websockets

A tiny socket.io server which can handle `async/await` requests.

This repo also packs a `async-await-websockets/client.js` which:

- initiates a socket.io connection
- adds the `socket.asyncEmit` functionality to your socket instance

## How to create your own server

1. `mkdir my-server`
2. `cd my-server`
3. `npm init`
4. Add to package.json

```
"type": "module",
"scripts": {
  "dev": "node index.js"
},
```

5. `npm install async-await-websockets`
6. Create `index.js` with contents:

```
import aaw from "async-await-websockets";

aaw("events");
```

7. Add directory `events`
8. `npm run dev`

Your server should now be reachable on ws://localhost:1337

## Configuration

`aaw(root, hooks, port, config, server, log)`

### root (string)

Name of directory that holds your socket events.

Default: `events`

### hooks (object)

Additional instances that you need access to in your socket events (MongoDB for example).

Default: `{}`

### port (integer)

A port of your liking.

Default: `1337`

### config (object)

Server configuration (https://socket.io/docs/v3/server-api/index.html) of your liking.

Default:

```
{
  cors: {
    origin: "*",
  },
}
```

(note: cors is required since socket.io version 4.0.0 and should never be the default \* in production)

### server (nodejs server instance)

If you want the socket server to attach to another server (for example a http-one) you can pass the node server here.

Default: `undefined`

### log (function)

With the parameter signature `(event, socketID, async, error, body, response)` you can create custom server logging for all events called through `root`-directory.

Default: `undefined`

## Your server

`aaw` returns an `io`-instance which you can create custom socket.io functionality on.

`events` should contain `.js`-files. These files are scanned and will be callable with `socket.asyncEmit('fileName')`.

This is the signature for any `.js` file within `events`.

```
export default async (body, _socket, _io, hooks) => {
  const response = await hooks.mongo.insertSomething(body.id);
  return response;
}
```

Omitting the `async` keyword will treat the event as a regular socket.io emit event.

## Your client

`npm install async-await-websockets`

```
import io from 'async-await-websockets';

(async () => {
  try {
    const socket = await io.default("ws://localhost:1337");
    const result = await socket.asyncEmit("example-async", { somedata: "for the backend" });
    console.log(result);
  } catch ({ error }) {
    console.error(error);
  }
})();
```

- First `await` is to initialize the socket connection. `io.default` parameters:

  - `url` (string, default `''`)

- Second `await` is to retrieve information from the server. `socket.asyncEmit` parameters:

  - `name` (string, required!)
  - `payload` (any, default `undefined`)
  - `timeout` (integer, default `3000`)

In the above example we're doing these next to one another. You can split them up and define `socket` globally for your project.

## Error handling

When calling `socket.asyncEmit('someEvent')` there are two possible failures:

1. The call to your socket server timed out (happens on the client).
2. The server threw an error because something went wrong.

In both cases `asyncEmit` will throw an object that contains an error-message like so:

```
{
  error: "What went wrong"
}
```
