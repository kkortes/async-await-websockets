export default (body, { ws }) => {
  ws.sendEvent("notified", { seen: body });
};
