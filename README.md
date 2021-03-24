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
"main": "server.js",
"type": "module",
"scripts": {
  "dev": "node server.js"
},
```

5. `npm install async-await-websockets`
6. Create `server.js` with contents:

```
import aaw from "async-await-websockets";

aaw("endpoints");
```

7. Add directory `endpoints`
8. `npm run dev`

Your server should now be reachable on ws://localhost:1337

## Configuration

`aaw(path, hooks, port, config)`

### path (string)

Name of directory that holds your socket events.

Default: `endpoints`

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

(note that cors is required since socket.io version 4.0.0 and should never be the default \* in production)

## Your server

`aaw` returns an `io`-instance which you can create custom socket.io functionality on.

`endpoints` should contain `.js`-files. These files are scanned and will be callable with `socket.asyncEmit('fileName')`.

This is the signature for any `.js` file within `endpoints`.

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
import io from 'async-await-websockets/client.js';

(async () => {
  try {
    const socket = await io.default("ws://localhost:1337");
    const result = await socket.asyncEmit("example-async", { somedata: "for the backend" });
    console.log(JSON.stringify(result));
  } catch ({ error }) {
    console.error(error);
  }
})();
```

Please note that initating a socket connection happens in two steps. You can globally set the socket elsewhere in step 1:
`const socket = await io.default("ws://localhost:1337");` and access socket anywhere in your app.

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
