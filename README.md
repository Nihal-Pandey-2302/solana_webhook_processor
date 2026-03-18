# Solana Webhook Processor

A production-grade webhook ingestion and alerting service for Solana, built with Node.js, Express, TypeScript, PostgreSQL, and Redis (Bull Queue).

## Features
- **Helius Webhook Ingestion**: Scalable ingestion via a Redis-backed job queue.
- **Background Processing**: Parses transactions, normalizes events to Postgres, and evaluates user-defined alert rules asynchronously.
- **Alert Delivery**: Pushes matching events to an external queue for delayed email/Telegram processing.
- **REST API**: Fully typed REST API with authentication and rate-limiting to manage Watched Addresses and Alert Rules.

## Architecture & Technology Choices
- **Node.js & TypeScript**: Strongly-typed business logic and configuration (`zod`).
- **Express**: Simplest and most established Node.js HTTP framework.
- **PostgreSQL**: Stores relational mapping between addresses, alert rules, and immutable raw transaction events. Raw parameterized SQL queries via `pg` are used for maximum optimization, avoiding ORM bloat.
- **Redis & Bull**: Provides a reliable pub-sub job queue. Helius can fire massive spikes of transactions. Dropping them in redis queue instantly allows the HTTP route to return a 200 Fast, offloading processing and DB writes to the background workers.
- **Docker Compose**: Orchestrates all infrastructure components enabling immediately runnable dev environments.

## Quickstart

### 1. Start the DB and Redis
```bash
docker compose up -d postgres redis
```

### 2. Setup Environment
```bash
cp .env.example .env
npm install
```

### 3. Migrate and Seed DB
```bash
npm run migrate
npm run seed
```
*Note the test API string `test-api-key-123` generated from the seed script.*

### 4. Start the Application
Open two terminals, one for the API, one for the worker:
```bash
npm run dev
npm run worker
```
*(Or use `docker compose up -d` to run everything together).*

## API Examples

### List Addresses
```bash
curl -X GET http://localhost:3000/addresses \
  -H "x-api-key: test-api-key-123"
```

### Register an Address
```bash
curl -X POST http://localhost:3000/addresses \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{"address": "FWznbcNXWQuHTawe9RxvQ2LdCEN2oaUS2fBHTP15MKhx"}'
```

### Create an Alert Rule
*Assuming the address id is `UUID_HERE`:*
```bash
curl -X POST http://localhost:3000/addresses/UUID_HERE/rules \
  -H "Content-Type: application/json" \
  -H "x-api-key: test-api-key-123" \
  -d '{"condition_type": "SOL_RECEIVED", "condition_value": "1000000", "channels": {"email": true}}'
```

### Query Events
```bash
curl -X GET "http://localhost:3000/events?address=FWznbcNXWQuHTawe9RxvQ2LdCEN2oaUS2fBHTP15MKhx&limit=10" \
  -H "x-api-key: test-api-key-123"
```

### Send Test Webhook (Simulating Helius)
```bash
curl -X POST http://localhost:3000/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '[{
        "signature": "mock_tx_sig_123",
        "slot": 150000,
        "feePayer": "FWznbcNXWQuHTawe9RxvQ2LdCEN2oaUS2fBHTP15MKhx",
        "accountData": [{"account": "FWznbcNXWQuHTawe9RxvQ2LdCEN2oaUS2fBHTP15MKhx"}],
        "nativeTransfers": [{"toUserAccount": "FWznbcNXWQuHTawe9RxvQ2LdCEN2oaUS2fBHTP15MKhx", "amount": 5000000}]
      }]'
```

## Testing
Run the comprehensive integration suite:
```bash
npm run test
```
