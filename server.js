import fs from "node:fs";
import { normalize } from "node:path";
import { pathToFileURL } from "node:url";
import ws, { WebSocketServer } from "ws";
// import { Server } from "socket.io";

const serveEndpoints = (io, socket, extra, root, path, log) =>
  fs.readdirSync(`${process.cwd()}/${root}${path}`).forEach(async (file) => {
    if (fs.lstatSync(`${process.cwd()}/${root}${path}/${file}`).isDirectory()) {
      serveEndpoints(io, socket, extra, root, `${path}/${file}`, log);
    } else {
      if (/(^|\/)\.[^\/\.]/g.test(file)) return;

      const { default: defaultExport } = await import(
        pathToFileURL(normalize(`${process.cwd()}/${root}${path}/${file}`)).href
      );
      const logPac = {
        event: file.replace(".js", ""),
        socketID: socket.id,
        async: true,
        body: undefined,
        response: undefined,
        error: false,
      };
      socket.on(
        `${path}/${file}`.substring(1).replace(".js", ""),
        defaultExport.constructor.name === "AsyncFunction"
          ? async (body, callback) => {
              let response;

              try {
                response = await defaultExport(body, io, socket, extra);
                if (typeof log === "function")
                  log(
                    {
                      ...logPac,
                      body,
                      response,
                    },
                    console.debug
                  );
              } catch (error) {
                response = {
                  error: error.toString(),
                };
                if (typeof log === "function")
                  log(
                    {
                      ...logPac,
                      body,
                      error: error.toString(),
                    },
                    console.error
                  );
              }
              return callback(response);
            }
          : (body, callback) => {
              let response;
              if (callback) {
                callback({
                  error: "The function you called isn't asyncronous",
                });
                return;
              }
              try {
                response = defaultExport(body, io, socket, extra);
                if (typeof log === "function")
                  log(
                    {
                      ...logPac,
                      async: false,
                      body,
                      response,
                    },
                    console.debug
                  );
              } catch (error) {
                response = {
                  error: error.toString(),
                };
                if (typeof log === "function")
                  log(
                    {
                      ...logPac,
                      async: false,
                      body,
                      error: error.toString(),
                    },
                    console.error
                  );
              }

              return response;
            }
      );
    }
  });

export default (
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

  // TODO: decide on (, config)
  const wss = new WebSocketServer({
    ...(server && { server }),
    port,
  });

  wss.on("connection", (ws) => {
    const eps = serveEndpoints(wss, ws, hooks, root, "", log);
    console.log(eps);
    ws.on("message", (data) => console.log(JSON.parse(data.toString())));
    ws.send("get back");
  });

  // wss.on("connection", (socket) =>
  //   serveEndpoints(wss, socket, hooks, root, "", log)
  // );
  console.log(`Server started on port ${port}`);
  return wss;
};
