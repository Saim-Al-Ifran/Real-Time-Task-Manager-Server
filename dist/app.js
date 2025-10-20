"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
dotenv_1.default.config();
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const task_socket_1 = require("./sockets/task.socket");
const app = (0, express_1.default)();
exports.app = app;
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: '*',
    credentials: true
}));
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
// health
app.get('/health', (_req, res) => res.json({ ok: true }));
// create server + socket
const server = http_1.default.createServer(app);
exports.server = server;
const io = new socket_io_1.Server(server, { cors: { origin: '*' } });
exports.io = io;
(0, task_socket_1.initTaskSocket)(io);
