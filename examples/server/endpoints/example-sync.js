export default (body, _socket, io, hooks) => {
  io.emit("example-sync-response", {
    dataFrom: "endpoints/example-sync.js",
    delivered: "non-deterministically",
    body,
    hooks,
  });
};
