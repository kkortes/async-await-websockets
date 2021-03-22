const request = (name, args) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject({ error: "Conduit client error: Request timed out" }),
      1000
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
