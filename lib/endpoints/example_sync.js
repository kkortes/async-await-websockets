export default (_body, _socket, io, _extra) => {
  io.emit("EXAMPLE_SYNC_RESPONSE", "Server replied!");
};
