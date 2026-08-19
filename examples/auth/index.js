import aaw from "../../server.js";

aaw("events", {}, 1338, undefined, {
  providers: ["sqlite"],
  database: "example-auth.sqlite",
  onReset: ({ user, token }) => console.info(`reset link for ${user.email}: /reset#${token}`),
});
