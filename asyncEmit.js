import { io } from "socket.io-client";

let socket = undefined;

const asyncEmit = (name, args, timeout) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject({ error: "Aaw client error: Request timed out" }),
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

export default url =>
  new Promise(resolve => {
    if (!socket) {
      socket = io.connect(url);

      socket.on("connect", () => {
        socket.asyncEmit = (name, args, timeout = 3000) =>
          asyncEmit(name, args, timeout, socket);

        resolve(socket);
      });
    } else {
      resolve(socket);
    }
  });
