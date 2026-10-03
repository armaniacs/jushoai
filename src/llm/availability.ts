export type AiStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'unsupported';

export interface LanguageModelSession {
  prompt(input: string, options?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

export interface LanguageModelStatic {
  availability(options?: unknown): Promise<AiStatus>;
  create(options?: unknown): Promise<LanguageModelSession>;
}

// availability() and create() must receive identical language specs, otherwise their results diverge.
export const LM_OPTIONS = {
  expectedOutputs: [{ type: 'text', languages: ['ja'] }],
};

export function getLanguageModel(): LanguageModelStatic | null {
  return (globalThis as { LanguageModel?: LanguageModelStatic }).LanguageModel ?? null;
}

export async function checkAiStatus(lm: LanguageModelStatic | null = getLanguageModel()): Promise<AiStatus> {
  if (!lm) return 'unsupported';
  try {
    return await lm.availability(LM_OPTIONS);
  } catch {
    return 'unavailable';
  }
}

// Unverified in a real browser: create() may need a user gesture, which a Service Worker lacks.
// Returns whether the attempt was accepted so callers can report honestly.
export async function startDownload(lm: LanguageModelStatic): Promise<boolean> {
  try {
    const session = await lm.create(LM_OPTIONS);
    session.destroy();
    return true;
  } catch {
    return false;
  }
}
