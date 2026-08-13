import aaw from "@ape-egg/async-await-websockets";

const { PORT } = process.env;

aaw(
  "events",
  { thirdPartyService: "example" },
  PORT,
  ({ event, websocketKey, async, body, result, error }, print) =>
    print(
      [
        `${error ? "🔴" : "🟢"} ${event}`,
        async ? "async" : "sync",
        websocketKey,
        JSON.stringify(body),
        error || JSON.stringify(result) || "no result",
      ].join(" | "),
    ),
);
