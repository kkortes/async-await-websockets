import fs from "fs";

export default (io, socket, extra) =>
  fs.readdirSync("./lib/endpoints").forEach(async directory => {
    const { default: defaultExport } = await import(`./endpoints/${directory}`);
    socket.on(
      directory.replace(".js", "").toUpperCase(),
      defaultExport.constructor.name === "AsyncFunction"
        ? async (body, callback) => {
            const result = await defaultExport(body, io, socket, extra);
            return await callback(result);
          }
        : body => defaultExport(body, io, socket, extra)
    );
  });
