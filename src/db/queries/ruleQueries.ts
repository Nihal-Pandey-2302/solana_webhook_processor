import { query } from '../index';
import { AlertRule } from '../../types';

export const createRule = async (
  address_id: string,
  condition_type: string,
  condition_value: string | null,
  channels: any
): Promise<AlertRule> => {
  const result = await query(
    `INSERT INTO alert_rules (address_id, condition_type, condition_value, channels)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [address_id, condition_type, condition_value, channels]
  );
  return result.rows[0];
};

export const deleteRule = async (id: string, address_id: string): Promise<boolean> => {
  const result = await query(
    'DELETE FROM alert_rules WHERE id = $1 AND address_id = $2',
    [id, address_id]
  );
  return (result.rowCount ?? 0) > 0;
};

export const getRulesForAddressId = async (address_id: string): Promise<AlertRule[]> => {
  const result = await query('SELECT * FROM alert_rules WHERE address_id = $1', [address_id]);
  return result.rows;
};

export const getRulesByAddresses = async (addresses: string[]): Promise<(AlertRule & { address: string })[]> => {
  if (addresses.length === 0) return [];
  // Using ANY($1::varchar[]) to pass the array to postgres
  const result = await query(
    `SELECT r.*, a.address 
     FROM alert_rules r 
     JOIN watched_addresses a ON r.address_id = a.id 
     WHERE a.address = ANY($1::varchar[])`,
    [addresses]
  );
  return result.rows;
};
