export default async (body, _socket, _io, hooks) => ({
  dataFrom: "events/example-async.js",
  delivered: "deterministically",
  body,
  hooks,
});
