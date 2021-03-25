import { io } from "socket.io-client";

let socket = undefined;

const asyncEmit = (name, payload, timeout) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject({ error: "Socket error (client): request timed out" }),
      timeout
    );
    socket.emit(name, payload, response => {
      clearTimeout(id);
      if (response.hasOwnProperty("error")) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });

export default (url = "") =>
  new Promise(resolve => {
    if (!socket) {
      socket = io.connect(url);

      socket.on("connect", () => {
        socket.asyncEmit = (name, payload, timeout = 3000) =>
          asyncEmit(name, payload, timeout, socket);

        resolve(socket);
      });
    } else {
      resolve(socket);
    }
  });
