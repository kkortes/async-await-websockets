import fs from "fs";
import { Server } from "socket.io";

export const asyncEmit = (name, args, timeout = 3000) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject({ error: "Conduit client error: Request timed out" }),
      timeout
    );
    socket.emit(name, args, response => {
      clearTimeout(id);
      if (response.hasOwnProperty("error")) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });

const serveEndpoints = (io, socket, extra, path) =>
  fs.readdirSync(`${process.cwd()}/${path}`).forEach(async directory => {
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
              result = { error: `Conduit server error: ${error.toString()}` };
            }
            return callback(result);
          }
        : (body, callback) =>
            callback
              ? callback({
                  error: `Conduit server error: the function you called isn't asyncronous`,
                })
              : defaultExport(body, io, socket, extra)
    );
  });

const Conduit = (
  path,
  hooks = {},
  port = 1337,
  config = {
    cors: {
      origin: "*",
    },
  }
) => {
  if (!path) throw new Error("Path must be set");
  const io = new Server(port, config);
  io.on("connection", socket => serveEndpoints(io, socket, hooks, path));
  console.log(`Server started on port ${port}`);
  return io;
};

export default Conduit;
