let ws, reconnector, eventTarget;

// In-flight sendAsync requests, keyed by the id sent on the wire. Replies are
// correlated by id, never by event name.
const pending = new Map();

const generateID = () =>
  `_${
    Number(String(Math.random()).slice(2)) +
    Date.now() +
    Math.round(performance.now()).toString(36)
  }`;

const AsyncAwaitWebsocket = (url, options) => {
  // Create once; reuse across internal reconnects so listeners registered via
  // ws.on survive.
  eventTarget = eventTarget || new EventTarget();
  const { reconnectInterval } = options || { reconnectInterval: 1000 };

  ws = new WebSocket(url, generateID());
  ws.sid = ws.protocol;

  ws.sendSync = (event, data) => ws.send(JSON.stringify([event, data]));

  ws.sendAsync = (event, data, timeout = 3000) =>
    new Promise((resolve, reject) => {
      const id = generateID();

      const timer = setTimeout(() => {
        pending.delete(id);
        reject({ error: "WebSocket error (client): request timed out" });
      }, timeout);

      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify([event, data, id]));
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
    const [event, detail, id] = JSON.parse(data);
    const request = id && pending.get(id);

    if (request) {
      clearTimeout(request.timer);
      pending.delete(id);
      detail?.error ? request.reject(detail) : request.resolve(detail);
      return;
    }

    // Id-less frames are server pushes and go to ws.on subscribers; an id we no
    // longer track is a reply that lost the race against its timeout.
    if (!id) eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  });

  return ws;
};

export default AsyncAwaitWebsocket;
