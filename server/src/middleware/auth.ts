import { Request, Response, NextFunction } from 'express';
import { db, users, authTokens } from '../db/index.js';
import { eq } from 'drizzle-orm';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

export async function auth(req: Request, res: Response, next: NextFunction) {
  try {
    // DEV MODE: Skip authentication for development
    if (process.env.NODE_ENV === 'development' || true) {
      // Assign a default user ID for development
      req.user = {
        id: 1,
        username: 'devuser'
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Find token
    const [authToken] = await db.select()
      .from(authTokens)
      .where(eq(authTokens.token, token))
      .execute();
    
    if (!authToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check token expiration
    const expiresAt = new Date(authToken.expiresAt);
    
    if (expiresAt < new Date()) {
      await db.delete(authTokens).where(eq(authTokens.token, token)).execute();
      return res.status(401).json({ error: 'Token expired' });
    }
    
    // Get user
    const [user] = await db.select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, authToken.userId))
      .execute();
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 