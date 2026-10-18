import { describe, it, expect } from 'vitest';
import {
  TRANSFER_TOTAL_CAP,
  TRANSFER_BACKSTOP_CAP,
  TRANSFER_CHUNK_SIZE,
  TRANSFER_CHUNK_TIMEOUT_MS,
  TRANSFER_TOTAL_TIMEOUT_MS,
  TRANSFER_STATUS_TIMEOUT_MS,
} from '../../src/llm/transfer-contract';
import {
  CLASSIFY_TIMEOUT_MS,
  CLASSIFY_TOTAL_TIMEOUT_MS,
  MAX_CLASSIFY_TOTAL,
} from '../../src/llm/background-gateway';
import { MAX_CLASSIFY_FIELDS, MAX_CLASSIFY_CHUNK } from '../../src/messages';

describe('transfer contract values (PBI-43)', () => {
  it('owns the agreed numbers in one place', () => {
    expect(TRANSFER_TOTAL_CAP).toBe(60);
    expect(TRANSFER_BACKSTOP_CAP).toBe(30);
    expect(TRANSFER_CHUNK_SIZE).toBe(20);
    expect(TRANSFER_CHUNK_TIMEOUT_MS).toBe(45_000);
    expect(TRANSFER_TOTAL_TIMEOUT_MS).toBe(60_000);
    expect(TRANSFER_STATUS_TIMEOUT_MS).toBe(5_000);
  });

  it('holds chunk < backstop <= total so a well-formed chunk never trips the receiver backstop', () => {
    expect(TRANSFER_CHUNK_SIZE).toBeLessThan(TRANSFER_BACKSTOP_CAP);
    expect(TRANSFER_BACKSTOP_CAP).toBeLessThanOrEqual(TRANSFER_TOTAL_CAP);
  });

  it('holds per-chunk timeout <= total timeout so the clamped sequential run stays within budget', () => {
    expect(TRANSFER_CHUNK_TIMEOUT_MS).toBeLessThanOrEqual(TRANSFER_TOTAL_TIMEOUT_MS);
  });
});

describe('both ends reference the single contract module (PBI-43)', () => {
  it('sender caps and timeouts are the contract values', () => {
    expect(MAX_CLASSIFY_TOTAL).toBe(TRANSFER_TOTAL_CAP);
    expect(CLASSIFY_TIMEOUT_MS).toBe(TRANSFER_CHUNK_TIMEOUT_MS);
    expect(CLASSIFY_TOTAL_TIMEOUT_MS).toBe(TRANSFER_TOTAL_TIMEOUT_MS);
  });

  it('receiver backstop and chunk width are the contract values', () => {
    expect(MAX_CLASSIFY_FIELDS).toBe(TRANSFER_BACKSTOP_CAP);
    expect(MAX_CLASSIFY_CHUNK).toBe(TRANSFER_CHUNK_SIZE);
  });
});
