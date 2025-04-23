import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { config } from 'dotenv';
import * as schema from './schema.js';

// Load environment variables
config();

// Database connection string
const databaseUrl = process.env.DATABASE_URL || 'file:./data.db';

// Create a SQLite database connection
const sqlite = new Database(databaseUrl.replace('file:', ''));

// Initialize Drizzle with the SQLite connection
export const db = drizzle(sqlite, { schema });

// Export the database schema
export * from './schema.js'; 