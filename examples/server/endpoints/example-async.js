export default async (body, _socket, _io, hooks) => ({
  dataFrom: "endpoints/example-async.js",
  delivered: "deterministically",
  body,
  hooks,
});
