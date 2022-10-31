import fs from "node:fs";
import { normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";

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
  server = undefined,
  log = undefined
) => {
  if (!eventDir) throw new Error("`eventDir` must be set");

  const endpoints = await serveEndpoints(eventDir, "");

  const wss = new WebSocketServer({
    ...(server && { server }),
    port,
  });

  wss.broadcast = (body, ws = undefined) =>
    wss.clients.forEach(
      (client) =>
        ws !== client && client.send(JSON.stringify(["broadcast", body]))
    );

  wss.on(
    "connection",
    (ws, { headers: { "sec-websocket-key": websocketKey } }) => {
      ws.id = websocketKey;
      // TODO: add client auth (to prevent anyone from connecting)

      ws.sendEvent = (event, data) => ws.send(JSON.stringify([event, data]));
      ws.broadcast = (body, includeSelf = false) =>
        wss.broadcast(body, includeSelf || ws);

      ws.on("message", (msg) => {
        const [event, body] = JSON.parse(msg.toString());
        const func = endpoints?.[event];
        const resolution = func && func(body || {}, { ws, ...services });

        (async () => {
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
                websocketKey,
                async,
                body: body || {},
                result,
                error,
              },
              console[error ? "error" : "debug"]
            );
        })();
      });
    }
  );

  console.info(`Server started on port ${port}`);
  return wss;
};
