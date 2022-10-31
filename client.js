const NATIVE_EVENTS = ["close", "error", "message", "open"];

function AsyncAwaitWebsocket(url, protocols, options) {
  const { reconnectInterval } = options || { reconnectInterval: 3000 };

  let ws,
    reconnector,
    persistant = document.createElement("div");

  this.connect = () => {
    ws = new WebSocket(url, protocols);

    ws.addEventListener("open", () => {
      console.info("connected");
      clearTimeout(reconnector);
    });

    ws.addEventListener("close", () => {
      reconnector = setTimeout(() => {
        console.info("reconnect");
        this.connect();
      }, reconnectInterval);
    });

    this.sendSync = (event, data) => ws.send(JSON.stringify([event, data]));

    this.sendAsync = (event, data, timeout = 3000) =>
      new Promise((resolve, reject) => {
        const trigger = ({ detail }) => {
          clearTimeout(id);
          persistant.removeEventListener(event, trigger);
          detail?.error ? reject(detail) : resolve(detail);
        };

        const id = setTimeout(() => {
          persistant.removeEventListener(event, trigger);
          reject({ error: "WebSocket error (client): request timed out" });
        }, timeout);

        ws.send(JSON.stringify([event, data]));
        persistant.addEventListener(event, trigger);
      });

    this.on = (event, callback) => {
      persistant.addEventListener(
        event,
        NATIVE_EVENTS.includes(event)
          ? callback
          : ({ detail }) => callback(detail)
      );
    };

    ws.addEventListener("message", ({ data }) => {
      const [event, detail] = JSON.parse(data);
      persistant.dispatchEvent(new CustomEvent(event, { detail }));
    });
  };

  this.connect();

  return this;
}

export default AsyncAwaitWebsocket.bind({});
