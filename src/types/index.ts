import { z } from 'zod';

// Models
export interface ApiKey {
  id: string;
  key_hash: string;
  created_at: Date;
}

export interface WatchedAddress {
  id: string;
  address: string;
  created_at: Date;
}

export interface AlertRule {
  id: string;
  address_id: string;
  condition_type: 'SOL_RECEIVED' | 'TOKEN_TRANSFERRED' | 'INSTRUCTION_FIRED' | 'ANY';
  condition_value: string | null;
  channels: {
    email?: boolean;
    telegram?: boolean;
  };
  created_at: Date;
}

export interface WebhookEvent {
  id: string;
  signature: string;
  slot: number;
  fee_payer: string | null;
  source_address: string | null;
  event_data: any;
  created_at: Date;
}

// DTOs & Validation Schemas
export const createAddressSchema = z.object({
  address: z.string().min(32).max(44), // reasonable length for Solana bs58 addresses
});

export const createRuleSchema = z.object({
  condition_type: z.enum(['SOL_RECEIVED', 'TOKEN_TRANSFERRED', 'INSTRUCTION_FIRED', 'ANY']),
  condition_value: z.string().nullable().optional(),
  channels: z.object({
    email: z.boolean().optional(),
    telegram: z.boolean().optional(),
  }),
});

export interface AlertJobData {
  rule_id: string;
  event_id: string;
  address: string;
  signature: string;
  message: string;
  channels: {
    email?: boolean;
    telegram?: boolean;
  };
}
