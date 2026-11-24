import { describe, it, expect } from 'vitest';
import {
  BACKUP_NUDGE_MIN_PROFILES,
  BACKUP_NUDGE_SNOOZE_MS,
  formatLastExportLine,
  isBackupNudgeSnoozed,
  shouldShowBackupNudge,
} from '../../src/core/backup-nudge';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);

describe('shouldShowBackupNudge', () => {
  it('shows when two profiles exist and nothing was exported or dismissed', () => {
    expect(
      shouldShowBackupNudge({ profileCount: 2, lastExportAt: null, dismissedAt: null }, NOW),
    ).toBe(true);
  });

  it('needs at least two profiles', () => {
    expect(BACKUP_NUDGE_MIN_PROFILES).toBe(2);
    expect(
      shouldShowBackupNudge({ profileCount: 1, lastExportAt: null, dismissedAt: null }, NOW),
    ).toBe(false);
    expect(
      shouldShowBackupNudge({ profileCount: 0, lastExportAt: null, dismissedAt: null }, NOW),
    ).toBe(false);
  });

  it('stays hidden once an export was recorded', () => {
    expect(
      shouldShowBackupNudge({ profileCount: 3, lastExportAt: NOW - DAY_MS, dismissedAt: null }, NOW),
    ).toBe(false);
  });

  it('stays hidden while the dismissal is fresh and returns after 30 days', () => {
    expect(BACKUP_NUDGE_SNOOZE_MS).toBe(30 * DAY_MS);
    expect(
      shouldShowBackupNudge({ profileCount: 2, lastExportAt: null, dismissedAt: NOW - 29 * DAY_MS }, NOW),
    ).toBe(false);
    expect(
      shouldShowBackupNudge({ profileCount: 2, lastExportAt: null, dismissedAt: NOW - 30 * DAY_MS }, NOW),
    ).toBe(true);
    expect(
      shouldShowBackupNudge({ profileCount: 2, lastExportAt: null, dismissedAt: NOW - 31 * DAY_MS }, NOW),
    ).toBe(true);
  });
});

describe('isBackupNudgeSnoozed', () => {
  it('is not snoozed without a dismissal', () => {
    expect(isBackupNudgeSnoozed(null, NOW)).toBe(false);
  });

  it('treats the 30-day boundary as expired', () => {
    expect(isBackupNudgeSnoozed(NOW - 30 * DAY_MS + 1, NOW)).toBe(true);
    expect(isBackupNudgeSnoozed(NOW - 30 * DAY_MS, NOW)).toBe(false);
    expect(isBackupNudgeSnoozed(NOW - 30 * DAY_MS - 1, NOW)).toBe(false);
  });

  it('treats a future dismissal as snoozed', () => {
    expect(isBackupNudgeSnoozed(NOW + DAY_MS, NOW)).toBe(true);
  });
});

describe('formatLastExportLine', () => {
  it('reports the missing export without a date', () => {
    expect(formatLastExportLine(null)).toBe('まだエクスポートしていません。');
  });

  it('formats the stored timestamp as a plain date', () => {
    expect(formatLastExportLine(Date.UTC(2026, 10, 1, 0, 0, 0))).toBe('最終エクスポート: 2026-11-01');
  });
});
