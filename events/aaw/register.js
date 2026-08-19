export default async ({ email, password }, { authenticate, auth: { store } }) => {
  if (!email || !password) throw Error("Email and password are required");
  if (await store.findUser(email)) throw Error("Email already registered");

  return authenticate(await store.createUser({ email, password }));
};
