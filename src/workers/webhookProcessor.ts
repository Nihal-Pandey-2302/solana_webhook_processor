import { webhookQueue, alertQueue } from './queue';
import { logger } from '../config/logger';
import { insertEvents } from '../db/queries/eventQueries';
import { getRulesByAddresses } from '../db/queries/ruleQueries';
import { WebhookEvent, AlertJobData } from '../types';
import pool from '../db/index';

webhookQueue.process('process-webhook', async (job) => {
  const { events } = job.data;
  if (!Array.isArray(events)) return;

  logger.info(`Processing webhook batch of ${events.length} events`);

  const normalizedEvents = [];
  const rulesToCheck = new Set<string>();

  // 1. Parse and extract
  for (const event of events) {
    const signature = event.signature || 'unknown';

    // Idempotency check
    try {
      const dupRes = await pool.query(
        'INSERT INTO processed_signatures (signature) VALUES ($1) ON CONFLICT DO NOTHING RETURNING *',
        [signature]
      );
      if (dupRes.rowCount === 0 && signature !== 'unknown') {
        logger.warn({ signature, action: 'duplicate_skipped' }, 'Duplicate webhook skipped');
        await pool.query(
          'INSERT INTO duplicate_skips (time_bucket, count) VALUES (date_trunc(\'hour\', NOW()), 1) ON CONFLICT (time_bucket) DO UPDATE SET count = duplicate_skips.count + 1'
        );
        continue;
      }
    } catch (dbErr) {
      logger.error({ err: dbErr, signature }, 'Error checking idempotency table');
    }

    const slot = event.slot || 0;
    const feePayer = event.feePayer || null;
    
    // accountData usually contains all addresses involved in the transaction
    const accounts: string[] = event.accountData?.map((a: any) => a.account) || [];
    if (feePayer && !accounts.includes(feePayer)) accounts.push(feePayer);
    
    accounts.forEach(a => rulesToCheck.add(a));

    normalizedEvents.push({
      signature,
      slot,
      fee_payer: feePayer,
      source_address: event.source || (accounts.length > 0 ? accounts[0] : null),
      event_data: event
    });
  }

  // 2. Insert normalized events into Db
  await insertEvents(normalizedEvents);

  // 3. Evaluate rules
  if (rulesToCheck.size === 0) return;

  const activeRules = await getRulesByAddresses(Array.from(rulesToCheck));
  if (activeRules.length === 0) return;

  for (const event of normalizedEvents) {
    const data = event.event_data;
    
    for (const rule of activeRules) {
      if (!isAddressInvolved(rule.address, data)) continue;

      let matched = false;
      let message = '';

      switch (rule.condition_type) {
        case 'SOL_RECEIVED': {
          const received = getSolReceived(rule.address, data);
          const threshold = rule.condition_value ? parseFloat(rule.condition_value) : 0;
          if (received > threshold) {
            matched = true;
            message = `Address ${rule.address} received ${received} lamports in tx ${event.signature}`;
          }
          break;
        }
        case 'TOKEN_TRANSFERRED': {
          if (hasTokenTransfer(rule.address, data)) {
            matched = true;
            message = `Token transfer involving ${rule.address} in tx ${event.signature}`;
          }
          break;
        }
        case 'INSTRUCTION_FIRED': {
          if (hasInstruction(rule.condition_value, data)) {
            matched = true;
            message = `Instruction ${rule.condition_value} fired in tx ${event.signature}`;
          }
          break;
        }
        case 'ANY': {
          matched = true;
          message = `Transaction involving ${rule.address} occurred: ${event.signature}`;
          break;
        }
      }

      // 4. Enqueue Alerts
      if (matched) {
        const alertJob: AlertJobData = {
          rule_id: rule.id,
          event_id: event.signature,
          address: rule.address,
          signature: event.signature,
          message,
          channels: rule.channels
        };
        
        await alertQueue.add('send-alert', alertJob, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        });
      }
    }
  }
});

// Helper functions for Helius payload structure
function isAddressInvolved(address: string, data: any): boolean {
  return data.accountData?.some((a: any) => a.account === address) || false;
}

function getSolReceived(address: string, data: any): number {
  if (!data.nativeTransfers) return 0;
  let total = 0;
  for (const t of data.nativeTransfers) {
    if (t.toUserAccount === address) {
      total += (t.amount || 0);
    }
  }
  return total;
}

function hasTokenTransfer(address: string, data: any): boolean {
  if (!data.tokenTransfers) return false;
  return data.tokenTransfers.some((t: any) => t.fromUserAccount === address || t.toUserAccount === address);
}

function hasInstruction(programId: string | null, data: any): boolean {
  if (!programId || !data.instructions) return false;
  return data.instructions.some((i: any) => i.programId === programId);
}
