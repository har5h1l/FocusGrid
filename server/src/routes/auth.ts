import express from 'express';
import { db, users, authTokens } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const router = express.Router();
const scryptAsync = promisify(scrypt);

// Helper functions
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, username)).execute();
    
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    
    // Hash password and create user
    const hashedPassword = await hashPassword(password);
    
    const [newUser] = await db.insert(users)
      .values({
        username,
        password: hashedPassword,
      })
      .returning({ id: users.id, username: users.username })
      .execute();
    
    // Generate auth token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days
    
    await db.insert(authTokens)
      .values({
        userId: newUser.id,
        token,
        expiresAt: expiresAt.toISOString(),
      })
      .execute();
    
    return res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const [user] = await db.select().from(users).where(eq(users.username, username)).execute();
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const passwordMatch = await comparePasswords(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate new token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Token valid for 7 days
    
    // Remove old tokens
    await db.delete(authTokens).where(eq(authTokens.userId, user.id)).execute();
    
    // Create new token
    await db.insert(authTokens)
      .values({
        userId: user.id,
        token,
        expiresAt: expiresAt.toISOString(),
      })
      .execute();
    
    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
      },
      token,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Delete token
    await db.delete(authTokens).where(eq(authTokens.token, token)).execute();
    
    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
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
    
    return res.status(200).json({ user });
  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as authRoutes }; 