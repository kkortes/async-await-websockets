import { Database } from "bun:sqlite";

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    password TEXT,
    allowed TEXT,
    created INTEGER NOT NULL,
    updated INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS providers (
    provider TEXT NOT NULL,
    subject TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (provider, subject)
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created INTEGER NOT NULL,
    expires INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS resets (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires INTEGER NOT NULL
  );
`;

const identity = (row) =>
  row && { id: row.id, email: row.email, ...(row.allowed && { allowed: JSON.parse(row.allowed) }) };

export default (filename = "aaw-auth.sqlite") => {
  const db = new Database(filename, { create: true });

  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");
  SCHEMA.split(";")
    .map((statement) => statement.trim())
    .filter(Boolean)
    .forEach((statement) => db.run(statement));

  const userById = db.query("SELECT * FROM users WHERE id = $id");
  const userByEmail = db.query("SELECT * FROM users WHERE email = $email");
  const insertUser = db.query(
    "INSERT INTO users (id, email, password, allowed, created, updated) VALUES ($id, $email, $password, $allowed, $created, $created)",
  );
  const updatePassword = db.query(
    "UPDATE users SET password = $password, updated = $updated WHERE id = $id",
  );
  const insertProvider = db.query(
    "INSERT OR REPLACE INTO providers (provider, subject, user_id) VALUES ($provider, $subject, $user_id)",
  );
  const userByProvider = db.query(
    "SELECT users.* FROM users JOIN providers ON providers.user_id = users.id WHERE providers.provider = $provider AND providers.subject = $subject",
  );
  const insertSession = db.query(
    "INSERT INTO sessions (token, user_id, created, expires) VALUES ($token, $user_id, $created, $expires)",
  );
  const userBySession = db.query(
    "SELECT users.* FROM users JOIN sessions ON sessions.user_id = users.id WHERE sessions.token = $token AND sessions.expires > $now",
  );
  const deleteSession = db.query("DELETE FROM sessions WHERE token = $token");
  const expireSessions = db.query("DELETE FROM sessions WHERE expires <= $now");
  const insertReset = db.query(
    "INSERT INTO resets (token, user_id, expires) VALUES ($token, $user_id, $expires)",
  );
  const resetByToken = db.query(
    "SELECT user_id FROM resets WHERE token = $token AND expires > $now",
  );
  const deleteReset = db.query("DELETE FROM resets WHERE token = $token");
  const deleteResetsFor = db.query("DELETE FROM resets WHERE user_id = $user_id");

  return {
    findUser: (email) => identity(userByEmail.get({ $email: email })),

    createUser: async ({ email, password, allowed }) => {
      const id = crypto.randomUUID();

      insertUser.run({
        $id: id,
        $email: email,
        $password: password ? await Bun.password.hash(password) : null,
        $allowed: allowed ? JSON.stringify(allowed) : null,
        $created: Date.now(),
      });

      return identity(userById.get({ $id: id }));
    },

    verify: async (email, password) => {
      const row = userByEmail.get({ $email: email });

      return row?.password && (await Bun.password.verify(password, row.password))
        ? identity(row)
        : null;
    },

    findByProvider: ({ provider, subject }) =>
      identity(userByProvider.get({ $provider: provider, $subject: subject })),

    linkProvider: ({ provider, subject, user }) =>
      insertProvider.run({ $provider: provider, $subject: subject, $user_id: user.id }),

    createSession: (user, ttl) => {
      const token = crypto.randomUUID();

      expireSessions.run({ $now: Date.now() });
      insertSession.run({
        $token: token,
        $user_id: user.id,
        $created: Date.now(),
        $expires: Date.now() + ttl,
      });

      return token;
    },

    readSession: (token) => identity(userBySession.get({ $token: token, $now: Date.now() })),

    endSession: (token) => deleteSession.run({ $token: token }),

    createReset: (user, ttl) => {
      const token = crypto.randomUUID();

      deleteResetsFor.run({ $user_id: user.id });
      insertReset.run({ $token: token, $user_id: user.id, $expires: Date.now() + ttl });

      return token;
    },

    consumeReset: async (token, password) => {
      const row = resetByToken.get({ $token: token, $now: Date.now() });

      if (!row) return null;

      deleteReset.run({ $token: token });
      updatePassword.run({
        $id: row.user_id,
        $password: await Bun.password.hash(password),
        $updated: Date.now(),
      });

      return identity(userById.get({ $id: row.user_id }));
    },
  };
};
