# Solana Webhook Processor

A production-grade webhook ingestion and alerting service for Solana, built with Node.js, Express, TypeScript, PostgreSQL, and Redis (Bull Queue).

This service operates as a high-throughput ingestion pipeline designed to reliably receive, parse, and store massive spikes of Solana blockchain transactions via Helius webhooks. By leveraging distributed Redis queues, the application fully decouples the fast, CPU-bound extraction of on-chain data into PostgreSQL from the slower, I/O-bound delivery of alerting notifications. This robust architecture enables developers to programmatically register wallet addresses and evaluate custom alert rules in real-time, instantly pushing critical on-chain events to end users via Email and Telegram without ever blocking or comprising the core ingestion event loop.

## Architecture & Technology Choices
- **Node.js & TypeScript**: Strongly-typed business logic and configuration (`zod`).
- **Express**: Simplest and most established Node.js HTTP framework.
- **PostgreSQL**: Stores relational mapping between addresses, alert rules, and immutable raw transaction events. Raw parameterized SQL queries via `pg` are used for maximum optimization, avoiding ORM bloat.
- **Redis & Bull**: Provides a reliable pub-sub job queue. Helius can fire massive spikes of transactions. Dropping them in redis queue instantly allows the HTTP route to return a 200 Fast, offloading processing and DB writes to the background workers.
- **Docker Compose**: Orchestrates all infrastructure components enabling immediately runnable dev environments.

## Design Decisions

**Why Bull over simple `setInterval`?**
Processing high-throughput webhooks requires a robust queueing mechanism. While a simple in-memory array with `setInterval` might suffice for a toy project, it fails at scale. Bull offloads jobs to Redis, providing distributed processing, automatic retries with exponential backoff, dead letter queues (DLQ), and concurrency control. This ensures that sudden spikes in Helius webhooks won't exhaust memory or block the Node.js event loop.

**Why separate alert delivery into its own queue?**
Parsing heavy Solana transactions and normalizing them into PostgreSQL is generally stable. Conversly, sending an email via Nodemailer or calling the Telegram Bot API are slow, I/O-bound operations prone to external rate limits and timeouts. By decoupling these concerns into separate `webhook-queue` and `alert-queue` processors, the ingestion pipeline remains completely unblocked even if the Telegram API goes down. Failing alerts can be retried independently without needing to re-parse the underlying transactions.

**Why handle idempotency at the database level?**
Attempting to handle idempotency in the application layer (e.g., performing a `SELECT` before an `INSERT`) introduces race conditions in distributed systems where multiple concurrent workers might process the exact same webhook payload simultaneously. By leveraging PostgreSQL's `INSERT ... ON CONFLICT DO NOTHING` constraint on the unique transaction signature, the database natively enforces strict atomicity. This guarantees that exactly one worker establishes the record, completely eliminating the risk of dual-writes and duplicate alerts.

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

## Production Readiness

### Graceful Shutdown
The application handles `SIGTERM` and `SIGINT` signals to perform a graceful shutdown:
1. Stops accepting new HTTP connections.
2. Pauses Bull queues so no new jobs are picked up.
3. Waits up to 15 seconds for active jobs to finish.
4. Closes the PostgreSQL connection pool.

### System Health
```bash
curl -X GET http://localhost:3000/health
```
Returns `200 OK` or `503 Service Unavailable` with latency metrics for PostgreSQL and Redis.

### System Metrics (Requires API Key)
```bash
curl -X GET http://localhost:3000/metrics \
  -H "x-api-key: test-api-key-123"
```
Returns queue depth, processed jobs count, DLQ pending count, etc.

### Dead Letter Queue (DLQ)
When webhook processing or alert delivery fails repeatedly (exhausting Bull retries), the job is moved to the `dead_letter_jobs` Postgres table.
- List DLQ Jobs:
  ```bash
  curl -X GET "http://localhost:3000/dlq?status=pending" -H "x-api-key: test-api-key-123"
  ```
- Retry a Job:
  ```bash
  curl -X POST http://localhost:3000/dlq/UUID_HERE/retry -H "x-api-key: test-api-key-123"
  ```
- Discard a Job:
  ```bash
  curl -X DELETE http://localhost:3000/dlq/UUID_HERE -H "x-api-key: test-api-key-123"
  ```

### Idempotency
Webhook ingestion deduplicates incoming payloads using the transaction `signature`. It stores processed signatures in the `processed_signatures` table. Exact duplicates send a `200 OK` immediately but are skipped by the background worker, bumping the `duplicate_skips` metric.

## Testing
Run the comprehensive integration suite:
```bash
npm run test
```
