const generateID = () =>
  `_${
    Number(String(Math.random()).slice(2)) +
    Date.now() +
    Math.round(performance.now()).toString(36)
  }`;

// `state` is created on the first call and carried through internal reconnects,
// so listeners registered via ws.on survive one — and two clients in the same
// process keep their own, rather than resolving each other's sendAsync calls.
const AsyncAwaitWebsocket = (
  url,
  options = {},
  state = { eventTarget: new EventTarget(), token: options.token },
) => {
  const { eventTarget } = state;
  const { reconnectInterval = 1000 } = options;

  const ws = new WebSocket(url, generateID());
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

  // The session lives on the connection, and the token is what re-establishes it
  // after an automatic reconnect — so it is held here rather than by the caller.
  ws.authenticate = async (token) => {
    const session = await ws.sendAsync("auth/resume", { token });
    state.token = session.token;
    return session;
  };

  ws.login = async (credentials, event = "auth/login") => {
    const session = await ws.sendAsync(event, credentials);
    state.token = session.token;
    return session;
  };

  ws.logout = async () => {
    await ws.sendAsync("auth/logout");
    state.token = undefined;
  };

  ws.on = (event, callback) => {
    const cb = ({ detail }) => callback(detail);
    eventTarget.addEventListener(event, cb);
    ws.off = (event) => eventTarget.removeEventListener(event, cb);
  };

  ws.addEventListener("open", async (detail) => {
    clearTimeout(state.reconnector);

    // Restore the session before anyone hears about the socket, so a caller's
    // first request inside `open` cannot race a reconnect it never saw.
    if (state.token)
      await ws.authenticate(state.token).catch((error) => {
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
    eventTarget.dispatchEvent(new CustomEvent(event, { detail }));
  });

  return ws;
};

export default AsyncAwaitWebsocket;
