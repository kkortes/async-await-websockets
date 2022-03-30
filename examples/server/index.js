import aaw from "async-await-websockets";
import dotenv from "dotenv";
dotenv.config();

const { PORT, CORS_ORIGIN } = process.env;

const typeSizes = {
  undefined: () => 0,
  boolean: () => 4,
  number: () => 8,
  string: (item) => 2 * item.length,
  object: (item) =>
    !item
      ? 0
      : Object.keys(item).reduce(
          (total, key) => sizeOf(key) + sizeOf(item[key]) + total,
          0
        ),
};

const sizeOf = (value) => typeSizes[typeof value](value);

aaw(
  "events",
  {},
  PORT,
  { cors: { origin: CORS_ORIGIN } },
  ({ event, socketID, async, error, body, response }, log) => {
    const { version, accountName } = body;
    const toLog = [];

    toLog.push(`${error ? "🔴" : "🟢"} ${event}`);
    toLog.push(version || "n/a");
    toLog.push(accountName || socketID);
    if (error) toLog.push(error);
    toLog.push(sizeOf(body));

    log(toLog.join(" | "));
  }
);
