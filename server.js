import fs from "fs";
import { Server } from "socket.io";

const serveEndpoints = (io, socket, extra, root, path, logs) =>
  fs.readdirSync(`${process.cwd()}/${root}${path}`).forEach(async (file) => {
    if (fs.lstatSync(`${process.cwd()}/${root}${path}/${file}`).isDirectory()) {
      serveEndpoints(io, socket, extra, root, `${path}/${file}`, logs);
    } else {
      if (/(^|\/)\.[^\/\.]/g.test(file)) return;

      const { default: defaultExport } = await import(
        `${process.cwd()}/${root}${path}/${file}`
      );
      const logPac = {
        event: `${root}${path}/${file}`,
        socketID: socket.id,
        type: undefined,
        body: undefined,
        response: undefined,
      };
      socket.on(
        `${path}/${file}`.substring(1).replace(".js", ""),
        defaultExport.constructor.name === "AsyncFunction"
          ? async (body, callback) => {
              let response;

              try {
                response = await defaultExport(body, io, socket, extra);
                if (logs)
                  console.debug({
                    ...logPac,
                    type: "async",
                    body,
                    response,
                  });
              } catch (error) {
                response = {
                  error: error.toString(),
                };
                if (logs)
                  console.error({
                    ...logPac,
                    type: "async",
                    body,
                    response,
                  });
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
                if (logs)
                  console.debug({
                    ...logPac,
                    type: "sync",
                    body,
                    response,
                  });
              } catch (error) {
                response = {
                  error: error.toString(),
                };
                if (logs)
                  console.error({
                    ...logPac,
                    type: "sync",
                    body,
                    response,
                  });
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
  logs = false
) => {
  if (!root) throw new Error("Root must be set");
  const io = new Server(port, config);
  io.on("connection", (socket) =>
    serveEndpoints(io, socket, hooks, root, "", logs)
  );
  console.log(`Server started on port ${port}`);
  return io;
};
