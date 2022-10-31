const NATIVE_EVENTS = ["close", "error", "message", "open"];

export default (url, protocols) => {
  const ws = new WebSocket(url, protocols);

  ws.sendSync = (event, data) => ws.send(JSON.stringify([event, data]));

  ws.sendAsync = (event, data, timeout = 3000) =>
    new Promise((resolve, reject) => {
      const trigger = ({ detail }) => {
        clearTimeout(id);
        ws.removeEventListener(event, trigger);
        detail?.error ? reject(detail) : resolve(detail);
      };

      const id = setTimeout(() => {
        ws.removeEventListener(event, trigger);
        reject({ error: "WebSocket error (client): request timed out" });
      }, timeout);

      ws.send(JSON.stringify([event, data]));
      ws.addEventListener(event, trigger);
    });

  ws.on = (event, callback) =>
    ws.addEventListener(
      event,
      NATIVE_EVENTS.includes(event)
        ? callback
        : ({ detail }) => callback(detail)
    );

  ws.addEventListener("message", ({ data }) => {
    const [event, detail] = JSON.parse(data);
    ws.dispatchEvent(new CustomEvent(event, { detail }));
  });

  return ws;
};
