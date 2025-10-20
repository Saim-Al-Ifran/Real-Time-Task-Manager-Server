import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
dotenv.config();

import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import { initTaskSocket } from './sockets/task.socket';

const app = express();
app.use(cookieParser());
app.use(cors({
     origin: '*',
     credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// health
app.get('/health', (_req, res) => res.json({ ok: true }));

// create server + socket
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

initTaskSocket(io);

export { app, server, io };
