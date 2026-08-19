export default (body, { ws }) => {
  ws.broadcast(body);
};
