import { pool } from '../config/db';
import bcrypt from 'bcrypt';
import { sha256 } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
dotenv.config();

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export const createUser = async (username: string, email: string, password: string) => {
  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email`,
    [username, email, hash]
  );
  return result.rows[0];
};

export const validateUser = async (email: string, password: string) => {
  const res = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = res.rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return { id: user.id, username: user.username, email: user.email };
};

export const createTokensForUser = async (user: { id: string; username?: string }) => {
  const accessToken = signAccessToken({ id: user.id, username: user.username });
  const jti = uuidv4();
  const refreshToken = signRefreshToken({ id: user.id }, jti);
  const tokenHash = sha256(refreshToken);

  // parse expiry timestamp using token verify (or compute from now + config)
  const decoded: any = verifyRefreshToken(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await pool.query(
    `INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [jti, user.id, tokenHash, expiresAt]
  );

  return { accessToken, refreshToken, expiresAt };
};

export const rotateRefreshToken = async (oldRefreshToken: string) => {
  // verify old token and rotate
  const decoded: any = verifyRefreshToken(oldRefreshToken);
  const oldJti: string = decoded.jti;
  const userId: string = decoded.id;

  // lookup existing token record
  const found = await pool.query('SELECT * FROM refresh_tokens WHERE jti=$1', [oldJti]);
  const row = found.rows[0];
  if (!row) throw new Error('Refresh token not found');

  if (row.revoked) throw new Error('Refresh token revoked');

  // verify hash
  const oldHash = sha256(oldRefreshToken);
  if (oldHash !== row.token_hash) throw new Error('Token hash mismatch');

  // Revoke old and insert new
  const newJti = uuidv4();
  const newRefreshToken = signRefreshToken({ id: userId }, newJti);
  const newHash = sha256(newRefreshToken);
  const decodedNew: any = verifyRefreshToken(newRefreshToken);
  const newExpires = new Date(decodedNew.exp * 1000);

  await pool.query('BEGIN');
  try {
    await pool.query('UPDATE refresh_tokens SET revoked = true, replaced_by_jti = $1 WHERE jti = $2', [
      newJti,
      oldJti
    ]);
    await pool.query(
      'INSERT INTO refresh_tokens (jti, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [newJti, userId, newHash, newExpires]
    );
    await pool.query('COMMIT');
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }

  const accessToken = signAccessToken({ id: userId });
  return { accessToken, refreshToken: newRefreshToken, expiresAt: newExpires };
};

export const revokeRefreshToken = async (token: string) => {
  try {
    const decoded: any = verifyRefreshToken(token);
    const jti = decoded.jti;
    await pool.query('UPDATE refresh_tokens SET revoked = true WHERE jti = $1', [jti]);
  } catch (err) {
    // ignore invalid token
  }
};
