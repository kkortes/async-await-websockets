import fs from "node:fs";
import { normalize } from "node:path";
import { pathToFileURL } from "node:url";

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
) => {
  if (!eventDir) throw new Error("`eventDir` must be set");

  const endpoints = await serveEndpoints(eventDir, "");

  const clientPool = {};

  const broadcast = (body, ws = undefined) =>
    Object.values(clientPool).forEach(
      (client) =>
        ws !== client && client.send(JSON.stringify(["broadcast", body])),
    );

  serve({
    port,
    fetch: (req, server) => {
      // A hack: use sec-websocket-protocol as the socket id (named `data` in Bun)
      if (
        server.upgrade(req, { data: req.headers.get("sec-websocket-protocol") })
      )
        return;

      return new Response("Couldn't upgrade the websocket, handshake failed", {
        status: 500,
      });
    },
    websocket: {
      message: (ws, msg) => {
        const [event, body] = JSON.parse(msg.toString());
        const func = endpoints?.[event];

        const resolution = func && func(body || {}, { ws, ...services });

        (async () => {
          const res = await resolution;

          let result,
            error,
            async = func.constructor.name === "AsyncFunction";

          try {
            result = async ? await resolution : resolution;
          } catch (err) {
            error = err.toString();
          }

          async && ws.send(JSON.stringify([event, error ? { error } : result]));

          typeof log === "function" &&
            log(
              {
                event,
                websocketKey: ws.data,
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
      },
      drain: (ws) => {},
    },
  });

  console.info(`Server started on port ${port}`);
};
