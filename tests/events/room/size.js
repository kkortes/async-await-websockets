export default async (body, { room }) => ({ size: room.size(body.name) });
