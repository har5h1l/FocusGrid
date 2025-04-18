import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set in your .env file.",
  );
}

// Create a SQLite client using libsql
const client = createClient({
  url: process.env.DATABASE_URL,
});

// Initialize drizzle with the SQLite client
export const db = drizzle(client, { schema });
