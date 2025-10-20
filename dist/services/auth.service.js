"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeRefreshToken = exports.rotateRefreshToken = exports.createTokensForUser = exports.validateUser = exports.createUser = void 0;
const db_1 = require("../config/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
const hash_1 = require("../utils/hash");
const jwt_1 = require("../utils/jwt");
const uuid_1 = require("uuid");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const createUser = async (username, email, password) => {
    const hash = await bcrypt_1.default.hash(password, SALT_ROUNDS);
    const result = await db_1.pool.query(`INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email`, [username, email, hash]);
    return result.rows[0];
};
exports.createUser = createUser;
const validateUser = async (email, password) => {
    const res = await db_1.pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = res.rows[0];
    if (!user)
        return null;
    const ok = await bcrypt_1.default.compare(password, user.password_hash);
    if (!ok)
        return null;
    return { id: user.id, username: user.username, email: user.email };
};
exports.validateUser = validateUser;
const createTokensForUser = async (user) => {
    const accessToken = (0, jwt_1.signAccessToken)({ id: user.id, username: user.username });
    const jti = (0, uuid_1.v4)();
    const refreshToken = (0, jwt_1.signRefreshToken)({ id: user.id }, jti);
    const tokenHash = (0, hash_1.sha256)(refreshToken);
    // parse expiry timestamp using token verify (or compute from now + config)
    const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
    const expiresAt = new Date(decoded.exp * 1000);
    await db_1.pool.query(`INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`, [jti, user.id, tokenHash, expiresAt]);
    return { accessToken, refreshToken, expiresAt };
};
exports.createTokensForUser = createTokensForUser;
const rotateRefreshToken = async (oldRefreshToken) => {
    // verify old token and rotate
    const decoded = (0, jwt_1.verifyRefreshToken)(oldRefreshToken);
    const oldJti = decoded.jti;
    const userId = decoded.id;
    // lookup existing token record
    const found = await db_1.pool.query('SELECT * FROM refresh_tokens WHERE jti=$1', [oldJti]);
    const row = found.rows[0];
    if (!row)
        throw new Error('Refresh token not found');
    if (row.revoked)
        throw new Error('Refresh token revoked');
    // verify hash
    const oldHash = (0, hash_1.sha256)(oldRefreshToken);
    if (oldHash !== row.token_hash)
        throw new Error('Token hash mismatch');
    // Revoke old and insert new
    const newJti = (0, uuid_1.v4)();
    const newRefreshToken = (0, jwt_1.signRefreshToken)({ id: userId }, newJti);
    const newHash = (0, hash_1.sha256)(newRefreshToken);
    const decodedNew = (0, jwt_1.verifyRefreshToken)(newRefreshToken);
    const newExpires = new Date(decodedNew.exp * 1000);
    await db_1.pool.query('BEGIN');
    try {
        await db_1.pool.query('UPDATE refresh_tokens SET revoked = true, replaced_by_jti = $1 WHERE jti = $2', [
            newJti,
            oldJti
        ]);
        await db_1.pool.query('INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)', [newJti, userId, newHash, newExpires]);
        await db_1.pool.query('COMMIT');
    }
    catch (err) {
        await db_1.pool.query('ROLLBACK');
        throw err;
    }
    const accessToken = (0, jwt_1.signAccessToken)({ id: userId });
    return { accessToken, refreshToken: newRefreshToken, expiresAt: newExpires };
};
exports.rotateRefreshToken = rotateRefreshToken;
const revokeRefreshToken = async (token) => {
    try {
        const decoded = (0, jwt_1.verifyRefreshToken)(token);
        const jti = decoded.jti;
        await db_1.pool.query('UPDATE refresh_tokens SET revoked = true WHERE jti = $1', [jti]);
    }
    catch (err) {
        // ignore invalid token
    }
};
exports.revokeRefreshToken = revokeRefreshToken;
