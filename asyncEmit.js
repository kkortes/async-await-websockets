export default (name, args, timeout = 3000) =>
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
