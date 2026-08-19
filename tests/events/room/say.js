export default (body, { ws, room }) => {
  room.emit(body.name, "said", { text: body.text }, ws);
};
