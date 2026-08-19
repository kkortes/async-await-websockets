import fs from "node:fs";
import { normalize } from "node:path";
import { pathToFileURL } from "node:url";

import createAuth, { reserved } from "./auth/index.js";

const { serve } = Bun;

const serveEndpoints = async (root, path) => {
  const endpoints = fetchEndpoints(root, path);
  const results = await Promise.all(Object.values(endpoints));

  return Object.keys(endpoints).reduce((a, key, i) => {
    const func = results[i].default;
    return func ? { ...a, [key]: func } : a;
  }, {});
};

const fetchEndpoints = (root, path, b = {}) => {
  const projectRoot = process.cwd();
  const scanDir = `${root}${path}`;
  const fullPath = `${projectRoot}/${scanDir}`;
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

export default async (
  eventDir = "events",
  services = {},
  port = 1337,
  log = undefined,
  auth = false,
) => {
  if (!eventDir) throw new Error("`eventDir` must be set");

  const authentication = auth && createAuth(auth);
  const endpoints = await serveEndpoints(eventDir, "");

  if (authentication) {
    const clash = Object.keys(endpoints).find(reserved);

    if (clash)
      throw new Error(
        `"auth/" is reserved by aaw's authentication — rename ${eventDir}/${clash}.js`,
      );

    Object.assign(endpoints, authentication.events);
  }

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

      // Anything that is not an upgrade is a social provider redirecting a
      // browser back to us — the only reason aaw ever answers plain HTTP.
      return (
        (authentication && authentication.http(req)) ||
        new Response("Couldn't upgrade the websocket, handshake failed", {
          status: 500,
        })
      );
    },
    websocket: {
      message: (ws, msg) => {
        const [event, body] = JSON.parse(msg.toString());
        const func = endpoints?.[event];

        if (!func) {
          const error = `Unknown event: ${event}`;
          console.error(error, "— registered:", Object.keys(endpoints));
          ws.send(JSON.stringify([event, { error }]));
          return;
        }

        const denied = authentication && authentication.guard(event, ws);

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
            // The payload field is already named `error` — a stringified Error
            // prefixes every message with "Error: " on its way to a user.
            error = err.message ?? String(err);
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
