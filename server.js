import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

import serveEndpoints from "./lib/serveEndpoints.js";

const { PORT = 1337, CORS_ORIGIN } = process.env;

const io = new Server(PORT, {
  cors: {
    origin: CORS_ORIGIN,
  },
});

io.on("connection", socket =>
  serveEndpoints(io, socket, {
    expose: "this",
  })
);

// const { MongoClient } = require('mongodb');

// const document = path.join(__dirname, 'index.html');
// const html = fs.readFileSync(document);
// const server = micro(async (req, res) => res.end(html));
// const io = require('socket.io')(server);
// const config = require('../../api/config.js').default;

// let mongo;

// const client = new MongoClient(process.env.MONGOCONNECT, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// client.connect((error, db) => {
//   if (error) throw error;

//   mongo = db;

//   // socket-io handlers are in websocket-server.js
//   require('./websocket-server.js')(io, mongo);

//   // Start the application after the database connection is ready
//   server.listen(process.env.PORT || 3002, () =>
//     console.info(`Server started at ${config.endpoint.socket}`)
//   );
// });
