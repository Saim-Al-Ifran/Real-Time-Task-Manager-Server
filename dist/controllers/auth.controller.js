"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.refresh = exports.login = exports.register = void 0;
const authService = __importStar(require("../services/auth.service"));
// Cookie options (secure in production)
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // only over HTTPS in production
    sameSite: 'lax',
};
const register = async (req, res) => {
    try {
        const { username, email, password, display_name } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ message: 'Missing fields' });
        const user = await authService.createUser(username, email, password);
        if (display_name) {
            await (require('../config/db').pool).query('UPDATE users SET display_name=$1 WHERE id=$2', [display_name, user.id]);
        }
        res.status(201).json({ user });
    }
    catch (err) {
        if (err.code === '23505')
            return res.status(409).json({ message: 'User/email already exists' });
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await authService.validateUser(email, password);
        if (!user)
            return res.status(401).json({ message: 'Invalid credentials' });
        const tokens = await authService.createTokensForUser({
            id: user.id,
            username: user.username,
        });
        // store tokens in cookies
        res.cookie('accessToken', tokens.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('refreshToken', tokens.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.json({
            message: 'Login successful',
            user: { id: user.id, username: user.username, email: user.email },
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.login = login;
const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken)
            return res.status(400).json({ message: 'No refresh token found' });
        const rotated = await authService.rotateRefreshToken(refreshToken);
        res.cookie('accessToken', rotated.accessToken, {
            ...cookieOptions,
            maxAge: 15 * 60 * 1000, // 15 minutes
        });
        res.cookie('refreshToken', rotated.refreshToken, {
            ...cookieOptions,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        res.json({ message: 'Token refreshed' });
    }
    catch (err) {
        console.error(err);
        res.status(401).json({ message: err.message || 'Invalid refresh token' });
    }
};
exports.refresh = refresh;
const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken)
            await authService.revokeRefreshToken(refreshToken);
        // clear cookies
        res.clearCookie('accessToken', cookieOptions);
        res.clearCookie('refreshToken', cookieOptions);
        res.json({ message: 'Logged out' });
    }
    catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.logout = logout;
