export default (body, services) => {
  const {
    ws: { sendEvent },
  } = services;

  sendEvent("example-sync-response", {
    event: process.cwd(),
    delivered: "non-deterministically",
    body,
    services: Object.keys(services),
    sid: services.ws.sid,
  });
};
