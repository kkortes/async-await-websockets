import fs from "fs";
import { Server } from "socket.io";

const serveEndpoints = (io, socket, extra, root, path, log) =>
  fs.readdirSync(`${process.cwd()}/${root}${path}`).forEach(async (file) => {
    if (fs.lstatSync(`${process.cwd()}/${root}${path}/${file}`).isDirectory()) {
      serveEndpoints(io, socket, extra, root, `${path}/${file}`, log);
    } else {
      if (/(^|\/)\.[^\/\.]/g.test(file)) return;

      const { default: defaultExport } = await import(
        `${process.cwd()}/${root}${path}/${file}`
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
  log = undefined
) => {
  if (!root) throw new Error("Root must be set");
  const io = new Server(port, config);
  io.on("connection", (socket) =>
    serveEndpoints(io, socket, hooks, root, "", log)
  );
  console.log(`Server started on port ${port}`);
  return io;
};
