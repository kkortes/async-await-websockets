export default async ({ token, password }, { authenticate, auth: { store } }) => {
  if (!password) throw Error("A new password is required");

  const user = await store.consumeReset(token, password);

  if (!user) throw Error("Reset link is invalid or expired");

  return authenticate(user);
};
