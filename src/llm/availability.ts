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

// Model download needs a user gesture, so callers invoke this from the button click.
export async function startDownload(lm: LanguageModelStatic): Promise<void> {
  try {
    const session = await lm.create(LM_OPTIONS);
    session.destroy();
  } catch {
    // The status badge keeps reflecting the real state on the next check.
  }
}
