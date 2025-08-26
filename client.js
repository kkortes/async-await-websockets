let ws, reconnector, eventTarget;

const generateID = () =>
  `_${
    Number(String(Math.random()).slice(2)) +
    Date.now() +
    Math.round(performance.now()).toString(36)
  }`;

const AsyncAwaitWebsocket = (url, options) => {
  eventTarget = document.createElement("div");
  const { reconnectInterval } = options || { reconnectInterval: 1000 };

  ws = new WebSocket(url, generateID());
  ws.sid = ws.protocol;

  ws.sendSync = (event, data) => ws.send(JSON.stringify([event, data]));

  ws.sendAsync = (event, data, timeout = 3000) =>
    new Promise((resolve, reject) => {
      const trigger = ({ detail }) => {
        clearTimeout(id);
        eventTarget.removeEventListener(event, trigger);
        detail?.error ? reject(detail) : resolve(detail);
      };

      const id = setTimeout(() => {
        eventTarget.removeEventListener(event, trigger);
        reject({ error: "WebSocket error (client): request timed out" });
      }, timeout);

      ws.send(JSON.stringify([event, data]));
      eventTarget.addEventListener(event, trigger);
    });

  ws.on = (event, callback) => {
    const cb = ({ detail }) => callback(detail);
    eventTarget.addEventListener(event, cb);
    ws.off = (event) => eventTarget.removeEventListener(event, cb);
  };

  ws.addEventListener("open", (detail) => {
    clearTimeout(reconnector);
    eventTarget.dispatchEvent(new CustomEvent("open", { detail }));
  });

  ws.addEventListener("close", (detail) => {
    reconnector = setTimeout(
      AsyncAwaitWebsocket.bind(undefined, url, options),
      reconnectInterval,
    );
    eventTarget.dispatchEvent(new CustomEvent("close", { detail }));
  });

  ws.addEventListener("error", (detail) =>
    eventTarget.dispatchEvent(new CustomEvent("error", { detail })),
  );

  ws.addEventListener("message", ({ data }) => {
    const [event, detail] = JSON.parse(data);
    eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  });

  return ws;
};

export default AsyncAwaitWebsocket;
