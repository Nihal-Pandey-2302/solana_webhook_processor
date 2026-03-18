import { createApiKey } from '../db/queries/apiKeyQueries';
import { createAddress } from '../db/queries/addressQueries';
import { createRule } from '../db/queries/ruleQueries';
import pool from '../db/index';
import { logger } from '../config';
import crypto from 'crypto';

async function seed() {
  logger.info('Starting seed...');

  try {
    // 1. Create a test API key
    const rawKey = 'test-api-key-123';
    const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
    await createApiKey(hash);
    logger.info(`Seeded test API Key. Please use: ${rawKey}`);

    // 2. Create a watched address
    const testAddress = 'FWznbcNXWQuHTawe9RxvQ2LdCEN2oaUS2fBHTP15MKhx'; // randomly chosen public address or custom one
    const addressRecord = await createAddress(testAddress);
    logger.info(`Seeded watched address: ${testAddress}`);

    // 3. Create a test alert rule for this address
    await createRule(addressRecord.id, 'SOL_RECEIVED', '1000000', {
      email: true,
      telegram: false
    });
    logger.info(`Seeded alert rule for address ${testAddress} on SOL_RECEIVED > 1000000 lamports.`);

  } catch (err) {
    logger.error({ err }, 'Seed failed');
  } finally {
    pool.end();
  }
}

seed();
