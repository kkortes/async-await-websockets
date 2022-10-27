import fs from "node:fs";
import { normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";

const serveEndpoints = async (root, path) => {
  const eps = fetchEndpoints(root, path);

  const results = await Promise.all(Object.values(eps));

  return Object.keys(eps).reduce((a, key, i) => {
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

  return filesAtDepth.forEach(async (file) => {
    if (fs.lstatSync(`${fullPath}/${file}`).isDirectory()) {
      serveEndpoints(wss, ws, extra, root, `${path}/${file}`, log);
    } else {
      if (/(^|\/)\.[^\/\.]/g.test(file)) return;

      const { default: defaultExport } = await import(
        pathToFileURL(normalize(`${fullPath}/${file}`)).href
      );

      const logPac = {
        event: file.replace(".js", ""),
        socketID: ws.id,
        async: true,
        body: undefined,
        response: undefined,
        error: false,
      };

      console.log("should come before `message`");

      // ws.on(
      //   `${path}/${file}`.substring(1).replace(".js", ""),
      //   defaultExport.constructor.name === "AsyncFunction"
      //     ? async (body, callback) => {
      //         let response;

      //         try {
      //           response = await defaultExport(body, wss, ws, extra);
      //           if (typeof log === "function")
      //             log(
      //               {
      //                 ...logPac,
      //                 body,
      //                 response,
      //               },
      //               console.debug
      //             );
      //         } catch (error) {
      //           response = {
      //             error: error.toString(),
      //           };
      //           if (typeof log === "function")
      //             log(
      //               {
      //                 ...logPac,
      //                 body,
      //                 error: error.toString(),
      //               },
      //               console.error
      //             );
      //         }
      //         return callback(response);
      //       }
      //     : (body, callback) => {
      //         let response;
      //         if (callback) {
      //           callback({
      //             error: "The function you called isn't asyncronous",
      //           });
      //           return;
      //         }
      //         try {
      //           response = defaultExport(body, wss, ws, extra);
      //           if (typeof log === "function")
      //             log(
      //               {
      //                 ...logPac,
      //                 async: false,
      //                 body,
      //                 response,
      //               },
      //               console.debug
      //             );
      //         } catch (error) {
      //           response = {
      //             error: error.toString(),
      //           };
      //           if (typeof log === "function")
      //             log(
      //               {
      //                 ...logPac,
      //                 async: false,
      //                 body,
      //                 error: error.toString(),
      //               },
      //               console.error
      //             );
      //         }

      //         return response;
      //       }
      // );
    }
  });
};

// TODO: throw away
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async (
  root = "events",
  hooks = {},
  port = 1337,
  config = {
    cors: {
      origin: "*",
    },
  },
  server = undefined,
  log = undefined
) => {
  if (!root) throw new Error("Root must be set");

  const eps = await serveEndpoints(root, "");
  console.log(eps);

  // TODO: decide on (, config)
  const wss = new WebSocketServer({
    ...(server && { server }),
    port,
  });

  //  const logPac = {
  //    event: file.replace(".js", ""),
  //    socketID: undefined, // TODO: ws.id,
  //    async: true,
  //    body: undefined,
  //    response: undefined,
  //    error: false,
  //  };

  wss.on("connection", (ws) => {
    // TODO: store connections for ease of broadcast, give each connection its own unique id
    // TODO: make sure old connections are being removed
    // TODO old solution had `cors.origin = *` we need it now?
    // TODO: readdirSync & lstatSync prevents ws.on from being run on first load on client

    // const eps = serveEndpoints(wss, ws, hooks, root, "", log);
    // console.log(eps);

    ws.on("message", (msg) => {
      const [data, event] = JSON.parse(msg.toString());
      console.log({ data, event });
    });
  });

  console.info(`Server started on port ${port}`);
  return wss;
};
