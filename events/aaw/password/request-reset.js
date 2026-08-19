export default async ({ email }, { auth: { store, reset, onPasswordReset } }) => {
  if (!onPasswordReset)
    throw Error("Password reset is not configured (no onPasswordReset handler)");

  const user = await store.findUser(email);

  if (user) await onPasswordReset({ user, token: await reset(user) });

  return { ok: true };
};
