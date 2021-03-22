export default (_body, _socket, io, _extra) => {
  io.emit("example-sync-response", "Server replied!");
};
