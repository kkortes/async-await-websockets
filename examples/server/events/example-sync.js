export default (body, _socket, io, hooks) => {
  const data = {
    dataFrom: "events/example-sync.js",
    delivered: "non-deterministically",
    body,
    hooks,
  };
  io.emit("example-sync-response", data);
  return data;
};
