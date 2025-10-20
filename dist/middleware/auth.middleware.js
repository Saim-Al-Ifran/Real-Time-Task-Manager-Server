"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const requireAuth = (req, res, next) => {
    // First try to get token from cookies
    const token = req.cookies?.accessToken;
    // (Optional fallback) — in case token still comes from header
    const header = req.headers.authorization;
    const headerToken = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    const accessToken = token || headerToken;
    if (!accessToken)
        return res.status(401).json({ message: 'No access token provided' });
    try {
        const payload = jsonwebtoken_1.default.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        req.user = payload; // payload typically contains { id, username }
        next();
    }
    catch (err) {
        console.error('Auth error:', err);
        return res.status(401).json({ message: 'Invalid or expired access token' });
    }
};
exports.requireAuth = requireAuth;
