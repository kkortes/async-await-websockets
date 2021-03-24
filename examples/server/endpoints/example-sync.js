export default (_body, _socket, io, _hooks) => {
  io.emit("example-sync-response", {
    dataFrom: "endpoints/example-sync.js",
  });
};
