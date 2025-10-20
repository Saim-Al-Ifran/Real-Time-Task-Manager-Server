import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import { initTaskSocket } from "./sockets/task.socket";

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",  
    methods: ["GET", "POST"],
  },
});

initTaskSocket(io);

export {io};

server.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
