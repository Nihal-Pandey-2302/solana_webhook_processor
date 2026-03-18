import request from 'supertest';
import app from '../../src/api/index';
import pool from '../../src/db/index';
import { webhookQueue } from '../../src/workers/queue';
import { createApiKey } from '../../src/db/queries/apiKeyQueries';
import crypto from 'crypto';

// Setup test environment
let validApiKey = '';

beforeAll(async () => {
  const rawKey = 'integration-test-key';
  validApiKey = rawKey;
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  
  // Clear tables (only for test db if configured, but here we just ensure a test key exists)
  await pool.query('DELETE FROM api_keys');
  await createApiKey(hash);

  // Clear queues
  await webhookQueue.empty();
});

afterAll(async () => {
  await webhookQueue.close();
  await pool.end();
});

describe('Webhooks API Integration', () => {

  it('should reject requests without API key on protected routes', async () => {
    const res = await request(app).get('/addresses');
    expect(res.status).toBe(401);
  });

  it('should accept missing API key on the public webhook route', async () => {
    // We didn't set HELIUS_AUTH_SECRET in env, so it should pass
    const payload = [
      {
        signature: 'test_tx_123',
        slot: 1000,
        feePayer: 'payer1',
        accountData: [{ account: 'address1' }],
      }
    ];

    const res = await request(app).post('/webhooks/helius').send(payload);
    expect(res.status).toBe(200);

    // Verify it was queued
    const count = await webhookQueue.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('should reject invalid webhook payloads', async () => {
    const res = await request(app).post('/webhooks/helius').send({ not: 'an array' });
    expect(res.status).toBe(400);
  });

});

describe('REST API Core endpoints', () => {
  let addressId = '';

  it('should create a watched address', async () => {
    const res = await request(app)
      .post('/addresses')
      .set('x-api-key', validApiKey)
      .send({ address: 'IntegrationTestAddress1234567890123' });

    expect(res.status).toBe(201);
    expect(res.body.address).toBe('IntegrationTestAddress1234567890123');
    addressId = res.body.id;
  });

  it('should fetch the created address', async () => {
    const res = await request(app)
      .get('/addresses')
      .set('x-api-key', validApiKey);
    
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].address).toBe('IntegrationTestAddress1234567890123');
  });

  it('should create an alert rule for the address', async () => {
    const res = await request(app)
      .post(`/addresses/${addressId}/rules`)
      .set('x-api-key', validApiKey)
      .send({
        condition_type: 'SOL_RECEIVED',
        condition_value: '500000',
        channels: { email: true }
      });
    
    expect(res.status).toBe(201);
    expect(res.body.condition_type).toBe('SOL_RECEIVED');
  });

  it('should fetch events for the address (empty at first)', async () => {
    const res = await request(app)
      .get(`/events?address=IntegrationTestAddress1234567890123`)
      .set('x-api-key', validApiKey);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

});
