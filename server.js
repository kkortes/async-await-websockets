import fs from "node:fs";
import { normalize } from "node:path";
import { pathToFileURL } from "node:url";

import createAuth, { guarded, reserved } from "./auth/index.js";

const { serve } = Bun;

const serveEndpoints = async (root, path) => {
  const endpoints = fetchEndpoints(root, path);
  const modules = await Promise.all(Object.values(endpoints));

  return Object.keys(endpoints).reduce(
    (a, key, i) => (modules[i].default ? { ...a, [key]: modules[i] } : a),
    {},
  );
};

const fetchEndpoints = (root, path, b = {}) => {
  const fullPath = `${root}${path}`;
  const filesAtDepth = fs.readdirSync(`${fullPath}`);

  return filesAtDepth.reduce((a, file) => {
    if (fs.lstatSync(`${fullPath}/${file}`).isDirectory()) {
      return fetchEndpoints(root, `${path}/${file}`, a);
    } else {
      if (!/\.js$/.test(file)) return a;
      return {
        ...a,
        [`${path}/${file}`.substring(1).replace(".js", "")]: import(
          pathToFileURL(normalize(`${fullPath}/${file}`)).href
        ),
      };
    }
  }, b);
};

const handlers = (modules) =>
  Object.fromEntries(Object.entries(modules).map(([event, { default: fn }]) => [event, fn]));

export default async (
  eventDir = "events",
  services = {},
  port = 1337,
  log = undefined,
  auth = false,
) => {
  if (!eventDir) throw new Error("`eventDir` must be set");

  const modules = await serveEndpoints(`${process.cwd()}/${eventDir}`, "");
  const endpoints = handlers(modules);
  const clash = auth && Object.keys(endpoints).find(reserved);

  if (clash)
    throw new Error(`"aaw/" is reserved by aaw's authentication — rename ${eventDir}/${clash}.js`);

  const authentication = auth && createAuth(auth);

  if (authentication) {
    const builtIn = await serveEndpoints(`${import.meta.dir}/events`, "");

    Object.entries(handlers(builtIn)).forEach(([event, fn]) => (endpoints[event] = fn));
  }

  const unreachable = authentication ? [] : Object.keys(endpoints).filter(guarded);

  if (unreachable.length)
    console.warn(
      `Authentication is off — ${unreachable.length} event(s) under auth/ are unreachable:`,
      unreachable,
    );

  const clientPool = {};

  const broadcast = (body, ws = undefined) =>
    Object.values(clientPool).forEach(
      (client) =>
        ws !== client && client.send(JSON.stringify(["broadcast", body])),
    );

  // Rooms: targeted multicast to a named subset of connections. Membership is
  // per-connection (a Set of ws), so it clears automatically on disconnect.
  // Handlers receive a `room` API in their context; emit is ws-agnostic so a
  // later callback (e.g. a timer) can multicast after the triggering message.
  const rooms = {};

  const joinRoom = (ws, name) => (rooms[name] ??= new Set()).add(ws);

  const leaveRoom = (ws, name) => {
    const members = rooms[name];
    if (!members) return;
    members.delete(ws);
    if (!members.size) delete rooms[name];
  };

  const leaveAllRooms = (ws) => {
    for (const name of Object.keys(rooms)) leaveRoom(ws, name);
  };

  const emitToRoom = (name, event, data, except = undefined) => {
    const members = rooms[name];
    if (!members) return 0;
    let sent = 0;
    for (const client of members)
      if (client !== except) {
        client.send(JSON.stringify([event, data]));
        sent += 1;
      }
    return sent;
  };

  const server = serve({
    port,
    fetch: (req, server) => {
      // A hack: use sec-websocket-protocol as the socket id (named `data` in Bun)
      if (
        server.upgrade(req, { data: req.headers.get("sec-websocket-protocol") })
      )
        return;

      return (
        (authentication && authentication.http(req)) ||
        new Response("Couldn't upgrade the websocket, handshake failed", {
          status: 500,
        })
      );
    },
    websocket: {
      message: (ws, msg) => {
        let event, body;

        try {
          [event, body] = JSON.parse(msg.toString());
        } catch {
          return;
        }

        const func = Object.hasOwn(endpoints, event) && endpoints[event];

        if (!func) {
          const error = `Unknown event: ${event}`;
          console.error(error, "— registered:", Object.keys(endpoints));
          ws.send(JSON.stringify([event, { error }]));
          return;
        }

        const denied = authentication
          ? authentication.guard(event, ws)
          : guarded(event) && `Authentication is not enabled — ${event} is unreachable`;

        if (denied) {
          ws.send(JSON.stringify([event, { error: denied }]));
          return;
        }

        const room = {
          join: (name) => joinRoom(ws, name),
          leave: (name) => leaveRoom(ws, name),
          emit: emitToRoom,
          size: (name) => rooms[name]?.size || 0,
        };

        const resolution = func(body || {}, {
          ws,
          room,
          ...services,
          ...(authentication && authentication.context(ws)),
        });

        (async () => {
          try {
            const res = await resolution;
          } catch (_) {}

          let result,
            error,
            async = func.constructor.name === "AsyncFunction";

          try {
            result = async ? await resolution : resolution;
          } catch (err) {
            error = err.message || String(err);
          }

          async && ws.send(JSON.stringify([event, error ? { error } : result]));

          typeof log === "function" &&
            log(
              {
                event,
                websocketKey: ws.data,
                identity: ws.identity,
                async,
                body: body || {},
                result,
                error,
              },
              console[error ? "error" : "debug"],
            );
        })();
      },
      open: (ws) => {
        clientPool[ws.data] = ws;

        ws.sendEvent = (event, data) => ws.send(JSON.stringify([event, data]));
        ws.broadcast = (body, includeSelf = false) =>
          broadcast(body, includeSelf || ws);
      },
      close: (ws, code, message) => {
        delete clientPool[ws.data];
        leaveAllRooms(ws);
      },
      drain: (ws) => {},
    },
  });

  console.info(`Server started on port ${port}`);

  return server;
};
