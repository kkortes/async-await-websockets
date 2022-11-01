export default async (body, services) => ({
  event: process.cwd(),
  delivered: "deterministically",
  body,
  services: Object.keys(services),
  sid: services.ws.sid,
});
