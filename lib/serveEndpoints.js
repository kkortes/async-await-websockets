import fs from "fs";

export default (io, socket, extra) =>
  fs.readdirSync("./lib/endpoints").forEach(async directory => {
    const { default: defaultExport } = await import(`./endpoints/${directory}`);
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
