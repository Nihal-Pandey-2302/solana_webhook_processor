import { query } from '../index';
import { WebhookEvent } from '../../types';

export const insertEvents = async (
  events: Array<{ signature: string; slot: number; fee_payer: string | null; source_address: string | null; event_data: any }>
) => {
  if (events.length === 0) return [];

  // Assuming batched insert or inserting one by one
  // Since webhook payload can have multiple events, we use a transaction or UNNEST
  // For simplicity, let's insert them concurrently or sequentially, or build a parameter string.
  
  // Here we insert them one by one but in parallel Promise.all
  // "ON CONFLICT (signature) DO NOTHING" ensures idempotence
  const results = await Promise.all(
    events.map(async (e) => {
      const res = await query(
        `INSERT INTO events (signature, slot, fee_payer, source_address, event_data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (signature) DO NOTHING
         RETURNING *`,
        [e.signature, e.slot, e.fee_payer, e.source_address, e.event_data]
      );
      return res.rows[0];
    })
  );

  return results.filter(Boolean); // remove undefined if DO NOTHING hit
};

export const getEventsQuery = async (address: string, limit: number = 50): Promise<WebhookEvent[]> => {
  // We can query events that involve the address.
  // We can look at source_address OR if the JSONB event_data involves the address.
  // Actually, easiest is just searching the JSONB.
  // Helius provides a flat accountData array in the webhook payload, or we can search `event_data->'accountData' @> '"address"'` etc.
  // Or we just search stringifed JSON if it's simpler or use tsvector.
  // Let's use `CAST(event_data AS TEXT) LIKE '%user_address%'` or specifically Postgres JSONB paths.
  // But a generic way:
  const searchPattern = `%${address}%`;
  const result = await query(
    `SELECT * FROM events 
     WHERE source_address = $1 
     OR fee_payer = $1 
     OR CAST(event_data AS TEXT) LIKE $2
     ORDER BY created_at DESC 
     LIMIT $3`,
    [address, searchPattern, limit]
  );
  return result.rows;
};
