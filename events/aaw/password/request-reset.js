export const provider = "sqlite";

export default async ({ email }, { auth: { store, reset, onReset } }) => {
  const user = await store.findUser(email);

  if (user) await onReset?.({ user, token: await reset(user) });

  return { ok: true };
};
