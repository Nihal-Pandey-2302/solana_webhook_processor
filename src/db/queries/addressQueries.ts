import { query } from '../index';
import { WatchedAddress } from '../../types';

export const createAddress = async (address: string): Promise<WatchedAddress> => {
  const result = await query(
    'INSERT INTO watched_addresses (address) VALUES ($1) ON CONFLICT (address) DO UPDATE SET address=$1 RETURNING *',
    [address]
  );
  return result.rows[0];
};

export const getAllAddresses = async (): Promise<WatchedAddress[]> => {
  const result = await query('SELECT * FROM watched_addresses ORDER BY created_at DESC');
  return result.rows;
};

export const deleteAddress = async (id: string): Promise<boolean> => {
  const result = await query('DELETE FROM watched_addresses WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

export const getAddressById = async (id: string): Promise<WatchedAddress | null> => {
  const result = await query('SELECT * FROM watched_addresses WHERE id = $1', [id]);
  return result.rows[0] || null;
};

export const getAddressByString = async (address: string): Promise<WatchedAddress | null> => {
  const result = await query('SELECT * FROM watched_addresses WHERE address = $1', [address]);
  return result.rows[0] || null;
};
