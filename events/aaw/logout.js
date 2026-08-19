export default async (_, { auth: { session } }) => {
  await session.end();

  return { ok: true };
};
