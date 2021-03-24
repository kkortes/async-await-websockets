# aaw

![](https://wallpaperaccess.com/full/374183.jpg)

## async-await-websockets

- is a socket.io server that can handle `async/await` requests
- exposes a `asyncEmit` function which can be used on the client in order to make a `async/await` request

## Setup

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
import AAW from "async-await-websockets/index.js";

AAW("somedir");
```

7. Add directory `somedir`
8. `npm run dev`

Your server should now be started on http://localhost:1337.

## Configuration

`PPW(path, hooks, port, config)`

### path (string)

Provide a string pointing at `somedir` (or some other directory of your liking)

### hooks (object)

Pass an object containing references to various services that you want to use in your socket calls (such as MongoDB / Redis and so on..)

### port (integer)

Provide a port of your liking. Defaults to 1337.

### config (object)

Provide configuration (https://socket.io/docs/v3/server-api/index.html) of your liking. Defaults to:

```
{
  cors: {
    origin: "*",
  },
}
```

(note that cors is required since socket.io version 4.0.0 and should never be \* in production)

## Your server

`PPW` returns an `io`-instance which you can create custom socket.io functionality on.

`somedir` should contain `.js`-files. These files are scanned and available as `asyncEmit('fileName')` on the client.

This is the signature for any `.js` file within `somedir`

```
export default async (body, socket, io, hooks) => {
  const response = await hooks.mongo.insertSomething();
  return response;
}
```

Omitting the `async` keyword will treat the event as a regular socket.io emit event.

## Your client

`npm install async-await-websockets`

`example.html` is a temporary inclusion to this repo only to showcase how `asyncEmit` works. The idea is simple:

```
import asyncEmit from 'async-await-websockets/asyncEmit.js';

(async () => {
  try {
    const result = await asyncEmit("example-async", { somedata: "for the backend" });
    console.log(JSON.stringify(result));
  } catch ({ error }) {
    console.error(error);
  }
})();
```

## Error handling

When calling `asyncEmit('someEvent')` there are two possible failures:

1. The call to your socket server timed out (happens on the client).
2. The server threw an error because something went wrong.

In both cases `asyncEmit` will throw an object that contains a error-message like so:

```
{
  error: "What went wrong"
}
```
