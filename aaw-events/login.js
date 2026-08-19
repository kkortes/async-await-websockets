export const provider = "sqlite";

export default async ({ email, password }, { authenticate, auth: { store } }) => {
  const user = await store.verify(email, password);

  if (!user) throw Error("Invalid credentials");

  return authenticate(user);
};
