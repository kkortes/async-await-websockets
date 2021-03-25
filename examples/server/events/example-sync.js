export default (body, _socket, io, hooks) => {
  io.emit("example-sync-response", {
    dataFrom: "events/example-sync.js",
    delivered: "non-deterministically",
    body,
    hooks,
  });
};
