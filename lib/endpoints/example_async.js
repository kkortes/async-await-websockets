export default async (body, _socket, _io, extra) => {
  try {
    return { ...body, ...extra };
  } catch (error) {
    return { error: error.toString() };
  }
};
