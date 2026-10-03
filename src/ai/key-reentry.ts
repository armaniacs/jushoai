export interface KeyReentryInput {
  savedBaseUrl: string;
  newBaseUrl: string;
  hadKey: boolean;
  typedKey: string;
  removing: boolean;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// A stored key must never be sent to a host other than the one it was saved for.
export function needsKeyReentry(input: KeyReentryInput): boolean {
  if (!input.hadKey || input.typedKey !== '' || input.removing) return false;
  const saved = originOf(input.savedBaseUrl);
  const next = originOf(input.newBaseUrl);
  if (saved === null || next === null) return false;
  return saved !== next;
}
