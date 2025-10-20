import jwt, { SignOptions } from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const ACCESS_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;
const ACCESS_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
const REFRESH_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const accessOptions: SignOptions = { expiresIn: ACCESS_EXPIRES as any };
const refreshOptions: SignOptions = { expiresIn: REFRESH_EXPIRES as any };

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, ACCESS_SECRET, accessOptions);
};

export const signRefreshToken = (payload: object, jti: string) => {
  return jwt.sign({ ...payload, jti }, REFRESH_SECRET,refreshOptions);
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET);
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET) as any;
};
