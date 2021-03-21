# REPO IS WORK IN PROGRESS

## Get a REST from REST

Working with web services nowadays most oftenly means you'll be presenting and/or calling a REST api.

Using conduit you can use `async` & `await` with socket-io, expecting a response instead of optimistically waiting for one with `socket.on('EVENT')`.

This means that conduit is supposed to replace your standard REST api, but also deal with realtime socket transmits.

Example:
Let's say you make an online multiplayer game. For the account creation and login functionality you use `request`. For regular socket-io uses you use `emit`.

## How to

This repo presents an `endpoints`-directory. Every file in it automatically becomes an endpoint to which you can `emit` (syncronous) or `request` (asyncronous).

The signature for every asyncronous event is:

```
export default async (body, socket, io, extra) => {
   try {
     const response = await extra.mongo.insertSomething();
     return response;
   } catch(error) {
     return { error: error.toString() }
   }
}
```

Omitting the `async` keyword will treat the event as a regular socket io emit event.

## On the client

`index.html` is a temporary inclusion to this repo only to showcase how `request` works. The idea is simple:

```
(async () => {
  try {
    const result = await request("EXAMPLE_ASYNC", { somedata: "for the backend" });
    console.log(JSON.stringify(result));
  } catch ({ error }) {
    console.error(error);
  }
})();
```

## Todo

Make this package double purpose in the sense of:

- Being able to fork it and use as an API backend
- Being able to `import { socket, request } from 'conduit'` on the client. Allowing you to use `request` in order to do `async`/`await` requests