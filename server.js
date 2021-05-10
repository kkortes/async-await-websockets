import fs from "fs";
import { Server } from "socket.io";

const serveEndpoints = (io, socket, extra, root, path = "") =>
  fs.readdirSync(`${process.cwd()}/${root}/${path}`).forEach(async (file) => {
    if (
      fs.lstatSync(`${process.cwd()}/${root}/${path}/${file}`).isDirectory()
    ) {
      serveEndpoints(io, socket, extra, root, `${path}/${file}`);
    } else {
      const { default: defaultExport } = await import(
        `${process.cwd()}/${root}/${path}/${file}`
      );
      socket.on(
        `${path}/${file}`.substring(1).replace(".js", ""),
        defaultExport.constructor.name === "AsyncFunction"
          ? async (body, callback) => {
              let result;
              try {
                result = await defaultExport(body, io, socket, extra);
              } catch (error) {
                result = {
                  error: error.toString(),
                };
              }
              return callback(result);
            }
          : (body, callback) =>
              callback
                ? callback({
                    error: "The function you called isn't asyncronous",
                  })
                : defaultExport(body, io, socket, extra)
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
  }
) => {
  if (!root) throw new Error("Root must be set");
  const io = new Server(port, config);
  io.on("connection", (socket) => serveEndpoints(io, socket, hooks, root));
  console.log(`Server started on port ${port}`);
  return io;
};
