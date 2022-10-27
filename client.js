// import { io } from "socket.io-client";

let ws = undefined;

const asyncEmit = (name, payload, timeout) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject({ error: "WebSocket error (client): request timed out" }),
      timeout
    );
    ws.emit(name, payload, (response) => {
      clearTimeout(id);
      if (response?.error) {
        reject(response);
      } else {
        resolve(response);
      }
    });
  });

export default (url = "") => {
  if (!ws) {
    ws = new WebSocket(url);

    ws.asyncEmit = (name, payload, timeout = 3000) =>
      asyncEmit(name, payload, timeout, ws);
  }
  return ws;
};
