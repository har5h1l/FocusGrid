import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';

// Load environment variables
config();

// Get the directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log('Starting database migration...');

  // Database connection string
  const databaseUrl = process.env.DATABASE_URL || 'file:./data.db';
  const dbPath = databaseUrl.replace('file:', '');
  
  // Create the db directory if it doesn't exist
  const dbDir = dirname(dbPath);
  try {
    await fs.access(dbDir);
  } catch (error) {
    console.log(`Creating database directory: ${dbDir}`);
    await fs.mkdir(dbDir, { recursive: true });
  }

  // Create a SQLite database connection
  const sqlite = new Database(dbPath);
  
  // Initialize Drizzle with the SQLite connection
  const db = drizzle(sqlite);
  
  console.log('Running migrations...');
  
  // Run migrations (this will look in the drizzle directory at project root)
  const migrationsFolder = resolve(__dirname, '../../drizzle');
  
  try {
    migrate(db, { migrationsFolder });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
  
  sqlite.close();
}

main()
  .then(() => {
    console.log('Migration process complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 