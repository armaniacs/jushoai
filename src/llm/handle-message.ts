import { parseRequest } from '../messages';
import { checkAiStatus, startDownload, type LanguageModelStatic } from './availability';
import { PromptApiClassifier } from './classifier';

export interface HandlerDeps {
  lm: LanguageModelStatic | null;
}

// Returns undefined for anything that is not exactly one of the AI request shapes.
export async function handleMessage(msg: unknown, deps: HandlerDeps): Promise<unknown> {
  const req = parseRequest(msg);
  if (!req) return undefined;

  switch (req.type) {
    case 'ai-status':
      return { status: await checkAiStatus(deps.lm) };
    case 'ai-download':
      return { started: deps.lm ? await startDownload(deps.lm) : false };
    case 'ai-classify': {
      if (!deps.lm || (await checkAiStatus(deps.lm)) !== 'available') return { ok: false };
      try {
        const map = await new PromptApiClassifier(deps.lm).classify(req.fields);
        return { ok: true, entries: [...map] };
      } catch {
        return { ok: false };
      }
    }
  }
}
