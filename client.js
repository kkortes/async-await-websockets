import { io } from "socket.io-client";

let socket = undefined;

const asyncEmit = (name, payload, timeout) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject({ error: "Socket error (client): request timed out" }),
      timeout
    );
    socket.emit(name, payload, (response) => {
      clearTimeout(id);
      if (response?.error) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });

export default (url = "", config = { transports: ["websocket"] }) => {
  if (!socket) {
    socket = io(url, config);
    socket.asyncEmit = (name, payload, timeout = 3000) =>
      asyncEmit(name, payload, timeout, socket);
  }
  return socket;
};
