import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

const { PORT = 1337, CORS_ORIGIN } = process.env;

const io = new Server(PORT, {
  cors: {
    origin: CORS_ORIGIN,
  },
});

io.on("connection", socket => {
  console.log("somehting");
});
