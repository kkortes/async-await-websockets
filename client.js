const generateID = () =>
  `_${
    Number(String(Math.random()).slice(2)) +
    Date.now() +
    Math.round(performance.now()).toString(36)
  }`;

const AsyncAwaitWebsocket = (url, options) => {
  const { reconnectInterval = 1000 } = options || {};
  // One bus per instance; it outlives the sockets so listeners registered via
  // `on` survive internal reconnects.
  const eventTarget = new EventTarget();
  const listeners = new Map();
  let socket, reconnector, disposed;

  const connect = () => {
    socket = new WebSocket(url, generateID());

    socket.addEventListener("open", (detail) => {
      clearTimeout(reconnector);
      eventTarget.dispatchEvent(new CustomEvent("open", { detail }));
    });

    socket.addEventListener("close", (detail) => {
      disposed || (reconnector = setTimeout(connect, reconnectInterval));
      eventTarget.dispatchEvent(new CustomEvent("close", { detail }));
    });

    socket.addEventListener("error", (detail) =>
      eventTarget.dispatchEvent(new CustomEvent("error", { detail })),
    );

    socket.addEventListener("message", ({ data }) => {
      const [event, detail] = JSON.parse(data);
      eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
    });
  };

  const sendSync = (event, data) => socket.send(JSON.stringify([event, data]));

  const sendAsync = (event, data, timeout = 3000) =>
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

      socket.send(JSON.stringify([event, data]));
      eventTarget.addEventListener(event, trigger);
    });

  const off = (event, callback) => {
    const registered = listeners.get(event);
    eventTarget.removeEventListener(event, registered?.get(callback));
    registered?.delete(callback);
  };

  const on = (event, callback) => {
    const wrapped = ({ detail }) => callback(detail);
    const registered = listeners.get(event) || new Map();
    listeners.set(event, registered.set(callback, wrapped));
    eventTarget.addEventListener(event, wrapped);
    return () => off(event, callback);
  };

  const dispose = () => {
    disposed = true;
    clearTimeout(reconnector);
    socket.close();
  };

  connect();

  return {
    get sid() {
      return socket.protocol;
    },
    sendSync,
    sendAsync,
    on,
    off,
    dispose,
  };
};

export default AsyncAwaitWebsocket;
