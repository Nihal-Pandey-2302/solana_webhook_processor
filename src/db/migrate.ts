import fs from 'fs';
import path from 'path';
import pool from './index';
import { logger } from '../config';

async function migrate() {
  logger.info('Starting database migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create a simple migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pg_migrations (
        name VARCHAR PRIMARY KEY,
        run_on TIMESTAMP DEFAULT NOW()
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      const { rows } = await client.query('SELECT name FROM pg_migrations WHERE name = $1', [file]);
      if (rows.length === 0) {
        logger.info(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO pg_migrations (name) VALUES ($1)', [file]);
        logger.info(`Migration ${file} completed.`);
      }
    }

    await client.query('COMMIT');
    logger.info('Database migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Database migration failed');
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
