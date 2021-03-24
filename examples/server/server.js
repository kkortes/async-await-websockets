import AAW from "async-await-websockets";
import dotenv from "dotenv";
dotenv.config();

const { PORT, CORS_ORIGIN } = process.env;

AAW("endpoints", {}, PORT, { cors: { origin: CORS_ORIGIN } });
