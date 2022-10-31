export default async (_body, { ws: { broadcast } }) =>
  broadcast("this message was broadcasted!", true);
