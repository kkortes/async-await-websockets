const AUTH_EVENTS = [
  "aaw/login",
  "aaw/register",
  "aaw/resume",
  "aaw/logout",
  "aaw/password/set-new",
];

const generateID = () =>
  `_${
    Number(String(Math.random()).slice(2)) +
    Date.now() +
    Math.round(performance.now()).toString(36)
  }`;

const refusal = (detail) => Object.assign(new Error(detail.error), detail);

const AsyncAwaitWebsocket = (
  url,
  options = {},
  state = { eventTarget: new EventTarget(), token: options.token },
) => {
  const { eventTarget } = state;
  const { reconnectInterval = 1000 } = options;

  const ws = new WebSocket(url, generateID());
  ws.sid = ws.protocol;
  state.socket = ws;

  ws.sendSync = (event, data) => state.socket.send(JSON.stringify([event, data]));

  ws.sendAsync = (event, data, timeout = 3000) =>
    new Promise((resolve, reject) => {
      const trigger = ({ detail }) => {
        clearTimeout(id);
        eventTarget.removeEventListener(event, trigger);
        detail?.error ? reject(refusal(detail)) : resolve(detail);
      };

      const id = setTimeout(() => {
        eventTarget.removeEventListener(event, trigger);
        reject(refusal({ error: "WebSocket error (client): request timed out" }));
      }, timeout);

      state.socket.send(JSON.stringify([event, data]));
      eventTarget.addEventListener(event, trigger);
    });

  ws.on = (event, callback) => {
    const cb = ({ detail }) => callback(detail);
    eventTarget.addEventListener(event, cb);
    ws.off = (event) => eventTarget.removeEventListener(event, cb);
  };

  ws.addEventListener("open", async (detail) => {
    clearTimeout(state.reconnector);

    if (state.token)
      await ws.sendAsync("aaw/resume", { token: state.token }).catch((error) => {
        state.token = undefined;
        eventTarget.dispatchEvent(new CustomEvent("unauthorized", { detail: error }));
      });

    eventTarget.dispatchEvent(new CustomEvent("open", { detail }));
  });

  ws.addEventListener("close", (detail) => {
    state.reconnector = setTimeout(
      AsyncAwaitWebsocket.bind(undefined, url, options, state),
      reconnectInterval,
    );
    eventTarget.dispatchEvent(new CustomEvent("close", { detail }));
  });

  ws.addEventListener("error", (detail) =>
    eventTarget.dispatchEvent(new CustomEvent("error", { detail })),
  );

  ws.addEventListener("message", ({ data }) => {
    const [event, detail] = JSON.parse(data);

    if (AUTH_EVENTS.includes(event) && !detail?.error) state.token = detail?.token;

    eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  });

  return ws;
};

export default AsyncAwaitWebsocket;
