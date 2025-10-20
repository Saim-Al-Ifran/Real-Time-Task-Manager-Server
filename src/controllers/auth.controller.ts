import { Request, Response, CookieOptions } from 'express';
import * as authService from '../services/auth.service';

// Cookie options (secure in production)
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // only over HTTPS in production
  sameSite: 'lax',
};

export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: 'Missing fields' });

    const user = await authService.createUser(username, email, password);

    if (display_name) {
      await (require('../config/db').pool).query(
        'UPDATE users SET display_name=$1 WHERE id=$2',
        [display_name, user.id]
      );
    }

    res.status(201).json({ user });
  } catch (err: any) {
    if (err.code === '23505')
      return res.status(409).json({ message: 'User/email already exists' });

    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await authService.validateUser(email, password);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req: Request, res: Response) => {
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
  } catch (err: any) {
    console.error(err);
    res.status(401).json({ message: err.message || 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) await authService.revokeRefreshToken(refreshToken);

    // clear cookies
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
