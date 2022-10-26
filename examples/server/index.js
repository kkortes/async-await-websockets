import aaw from "async-await-websockets";
import dotenv from "dotenv";
dotenv.config();

const { PORT, CORS_ORIGIN } = process.env;

aaw(
  "events",
  {},
  PORT,
  { cors: { origin: CORS_ORIGIN } },
  undefined,
  ({ event, socketID, async, error, body, response }, log) => {
    const { version, accountName } = body;
    const toLog = [];

    toLog.push(`${error ? "🔴" : "🟢"} ${event}`);
    toLog.push(version || "n/a");
    toLog.push(accountName || socketID);
    if (error) toLog.push(error);

    log(toLog.join(" | "));
  }
);
