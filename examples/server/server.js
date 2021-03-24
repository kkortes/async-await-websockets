import aaw from "async-await-websockets";
import dotenv from "dotenv";
dotenv.config();

const { PORT, CORS_ORIGIN } = process.env;

aaw("endpoints", {}, PORT, { cors: { origin: CORS_ORIGIN } });
