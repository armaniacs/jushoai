// Backup nudge policy (PBI-284): when to suggest a JSON export on the
// options page. Pure: the options section injects the stored timestamps and
// the current profile count, so the boundary stays pinned by unit tests. Only
// timestamps are stored, never profile values.
export const BACKUP_NUDGE_MIN_PROFILES = 2;

export const BACKUP_NUDGE_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

export interface BackupNudgeState {
  profileCount: number;
  // Epoch milliseconds, or null when never recorded.
  lastExportAt: number | null;
  dismissedAt: number | null;
}

// True while a dismissal still suppresses the nudge: a future timestamp
// counts as snoozed so a clock skew cannot resurface the nudge at once.
export function isBackupNudgeSnoozed(dismissedAt: number | null, now: number = Date.now()): boolean {
  if (dismissedAt === null) return false;
  if (now < dismissedAt) return true;
  return now - dismissedAt < BACKUP_NUDGE_SNOOZE_MS;
}

// The nudge shows only before the first export: once an export is recorded
// the last-export line (formatLastExportLine) carries the reminder instead.
export function shouldShowBackupNudge(
  state: BackupNudgeState,
  now: number = Date.now(),
): boolean {
  if (state.profileCount < BACKUP_NUDGE_MIN_PROFILES) return false;
  if (state.lastExportAt !== null) return false;
  return !isBackupNudgeSnoozed(state.dismissedAt, now);
}

// One line for the transfer section: no date is shown before the first
// export, and the stored timestamp renders as a UTC date so the text is
// identical in every time zone.
export function formatLastExportLine(lastExportAt: number | null): string {
  if (lastExportAt === null) return 'まだエクスポートしていません。';
  const d = new Date(lastExportAt);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `最終エクスポート: ${y}-${m}-${day}`;
}
