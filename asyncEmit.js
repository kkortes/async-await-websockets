import { io } from "socket.io-client";

let socket = {};

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

export default url => {
  socket = io(url);
  return socket;
};
