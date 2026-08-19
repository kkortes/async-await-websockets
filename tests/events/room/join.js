export default (body, { room }) => {
  room.join(body.name);
};
