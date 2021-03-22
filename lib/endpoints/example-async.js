export default async (body, _socket, _io, extra) => {
  return { ...body, ...extra };
};
