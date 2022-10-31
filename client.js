const NATIVE_EVENTS = ["close", "error", "message", "open"];

const initWebsocket = (url, protocols) => {
  const ws = new WebSocket(url, protocols);

  ws.sendSync = (event, data) => ws.send(JSON.stringify([data, event]));

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

      ws.send(JSON.stringify([data, event]));
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
    const [detail, event] = JSON.parse(data);
    ws.dispatchEvent(new CustomEvent(event, { detail }));
  });

  return ws;
};

const ws = initWebsocket("ws://localhost:1337");

// export default initWebsocket;
