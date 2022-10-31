import aaw from "async-await-websockets";
import dotenv from "dotenv";
dotenv.config();

const { PORT } = process.env;

aaw(
  "events",
  { thirdPartyService: "example" },
  PORT,
  undefined,
  ({ event, websocketKey, _async, error, body, _result }, log) => {
    const { version } = body;
    const toLog = [];

    toLog.push(`${error ? "🔴" : "🟢"} ${event}`);
    toLog.push(version || "n/a");
    toLog.push(websocketKey);

    if (error) toLog.push(error);

    log(toLog.join(" | "));
  }
);
