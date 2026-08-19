export default async ({ token }, { auth: { session } }) => {
  const user = await session.restore(token);

  if (!user) throw Error("Session expired");

  return { token, user };
};
