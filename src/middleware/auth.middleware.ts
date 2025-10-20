import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // First try to get token from cookies
  const token = req.cookies?.accessToken;

  // (Optional fallback) — in case token still comes from header
  const header = req.headers.authorization;
  const headerToken = header && header.startsWith('Bearer ') ? header.split(' ')[1] : null;

  const accessToken = token || headerToken;

  if (!accessToken)
    return res.status(401).json({ message: 'No access token provided' });

  try {
    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!);
    req.user = payload; // payload typically contains { id, username }
    next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};
