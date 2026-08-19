export default (body, { room }) => {
  room.leave(body.name);
};
