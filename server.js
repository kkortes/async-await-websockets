import fs from "fs";
import { Server } from "socket.io";

const serveEndpoints = (io, socket, extra, path) =>
  fs.readdirSync(`${process.cwd()}/${path}`).forEach(async (directory) => {
    const { default: defaultExport } = await import(
      `${process.cwd()}/${path}/${directory}`
    );
    socket.on(
      directory.replace(".js", ""),
      defaultExport.constructor.name === "AsyncFunction"
        ? async (body, callback) => {
            let result;
            try {
              result = await defaultExport(body, io, socket, extra);
            } catch (error) {
              result = { error: `Socket error (server): ${error.toString()}` };
            }
            return callback(result);
          }
        : (body, callback) =>
            console.log(body) || callback
              ? callback({
                  error: `Socket error (server): the function you called isn't asyncronous`,
                })
              : defaultExport(body, io, socket, extra)
    );
  });

export default (
  path,
  hooks = {},
  port = 1337,
  config = {
    cors: {
      origin: ["*"],
    },
  }
) => {
  if (!path) throw new Error("Path must be set");
  const io = new Server(port, config);

  io.on("connection", (socket) => serveEndpoints(io, socket, hooks, path));
  console.log(
    `Server started on port :${port} accepting requests from ${JSON.stringify(
      config?.cors?.origin
    )}`
  );
  return io;
};
