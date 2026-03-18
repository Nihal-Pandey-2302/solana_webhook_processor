import { query } from '../index';
import { ApiKey } from '../../types';

export const getApiKeyByHash = async (hash: string): Promise<ApiKey | null> => {
  const result = await query(
    'SELECT * FROM api_keys WHERE key_hash = $1',
    [hash]
  );
  return result.rows[0] || null;
};

export const createApiKey = async (hash: string): Promise<ApiKey> => {
  const result = await query(
    'INSERT INTO api_keys (key_hash) VALUES ($1) RETURNING *',
    [hash]
  );
  return result.rows[0];
};
