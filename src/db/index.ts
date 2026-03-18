import { Pool } from 'pg';
import { config, logger } from '../config';

const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASS,
  database: config.DB_NAME,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle client');
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export const getClient = () => {
  return pool.connect();
};

export default pool;
