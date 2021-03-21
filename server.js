import { Server } from "socket.io";

const { PORT = 1337 } = process.env;

const io = new Server(PORT, {
  cors: {
    origin: "*",
  },
});

io.on("connection", socket => {
  console.log("somehting");
});
