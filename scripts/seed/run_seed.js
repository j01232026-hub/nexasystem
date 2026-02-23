
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('Error: DATABASE_URL not found in .env');
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false } // Required for Supabase/Neon
  });

  try {
    await client.connect();
    console.log('Connected to database...');

    const sqlPath = path.join(__dirname, 'seed_beauty_data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing seed script...');
    await client.query(sql);

    console.log('✅ Database seeded successfully with Beauty Salon data!');
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runSeed();
