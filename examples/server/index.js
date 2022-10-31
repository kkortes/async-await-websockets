import aaw from "async-await-websockets";
import dotenv from "dotenv";
dotenv.config();

const { PORT, CORS_ORIGIN } = process.env;

aaw(
  "events",
  { thirdPartyService: "example" },
  PORT,
  undefined,
  ({ event, websocketKey, async, error, body, response }, log) => {
    const { version } = body;
    const toLog = [];

    toLog.push(`${error ? "🔴" : "🟢"} ${event}`);
    toLog.push(version || "n/a");
    toLog.push(websocketKey);
    if (error) toLog.push(error);

    log(toLog.join(" | "));
  }
);
