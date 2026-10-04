import { createGeminiClassifier, createOpenAiClassifier, HttpAuthError, HttpRequestError } from '../ai/http-classifiers';
import { originPatternsFor } from '../ai/permissions';
import { validateAiSettings } from '../ai/settings';
import { computeCloudStatus } from '../ai/status';
import type { AiStatusInfo, ProviderKind, PublicAiSettings } from '../ai/types';
import type { FieldMeta } from '../core/types';
import { parseRequest, type TestResponse } from '../messages';
import { checkAiStatus, startDownload, type LanguageModelStatic } from './availability';
import { PromptApiClassifier, type FieldClassifier } from './classifier';

export interface HandlerDeps {
  lm: LanguageModelStatic | null;
  loadSettings(): Promise<PublicAiSettings>;
  loadSecrets(): Promise<{ openai?: string; gemini?: string }>;
  hasPermission(origins: string[]): Promise<boolean>;
  fetch: typeof fetch;
  // Providers that answered 401/403; owned by the background and cleared when settings change.
  authFailed: Set<ProviderKind>;
  // Providers that need the OpenAI-compatible fallback request; same lifetime as authFailed.
  compat: Set<ProviderKind>;
}

type Selection =
  | { ok: true; classifier: FieldClassifier }
  | { ok: false; reason: 'not-configured' | 'permission' | 'auth' | 'unavailable' };

async function statusOf(deps: HandlerDeps, s: PublicAiSettings): Promise<AiStatusInfo> {
  if (s.provider === 'built-in') return { status: await checkAiStatus(deps.lm), provider: 'built-in' };
  let hasKey = s.hasKey;
  // An envelope that no longer decrypts is the same as no key.
  if ((s.provider === 'openai' || s.provider === 'gemini') && hasKey[s.provider]) {
    const secrets = await deps.loadSecrets();
    if (secrets[s.provider] === undefined) hasKey = { ...hasKey, [s.provider]: false };
  }
  return {
    status: computeCloudStatus({
      settings: s,
      hasKey,
      permitted: await deps.hasPermission(originPatternsFor(s)),
      authFailed: deps.authFailed.has(s.provider),
    }),
    provider: s.provider,
  };
}

async function selectClassifier(
  deps: HandlerDeps,
  s: PublicAiSettings,
  opts: { ignoreAuthFailure?: boolean } = {},
): Promise<Selection> {
  const { status } = await statusOf(deps, s);
  if (status === 'disabled' || status === 'not-configured') return { ok: false, reason: 'not-configured' };
  if (status === 'permission-missing') return { ok: false, reason: 'permission' };
  if (status === 'auth-error' && !opts.ignoreAuthFailure) return { ok: false, reason: 'auth' };

  if (s.provider === 'built-in') {
    if (!deps.lm || status !== 'available') return { ok: false, reason: 'unavailable' };
    return { ok: true, classifier: new PromptApiClassifier(deps.lm) };
  }

  const secrets = await deps.loadSecrets();
  const present = { openai: secrets.openai !== undefined, gemini: secrets.gemini !== undefined };
  // The stored key can be unreadable even though an envelope exists; treat that as not configured.
  if (validateAiSettings(s, present).length > 0) return { ok: false, reason: 'not-configured' };
  if (s.provider === 'openai') {
    return { ok: true, classifier: createOpenAiClassifier(s.openai, secrets.openai, { fetch: deps.fetch }, {
        compat: deps.compat.has('openai'),
        onCompat: () => deps.compat.add('openai'),
      }) };
  }
  if (s.provider === 'gemini' && secrets.gemini) {
    return { ok: true, classifier: createGeminiClassifier(s.gemini, secrets.gemini, { fetch: deps.fetch }) };
  }
  return { ok: false, reason: 'not-configured' };
}

const TEST_FIELD: FieldMeta = {
  id: 't', tag: 'input', type: 'text', name: 'name', htmlId: '', autocomplete: '', label: 'お名前',
  placeholder: '山田 太郎', nearby: '', maxLength: null, pattern: '', options: [], readOnly: false,
  disabled: false, value: '',
};

async function runTest(deps: HandlerDeps, s: PublicAiSettings): Promise<TestResponse> {
  const sel = await selectClassifier(deps, s, { ignoreAuthFailure: true });
  if (!sel.ok) return { ok: false, reason: sel.reason === 'unavailable' ? 'network' : sel.reason };
  try {
    const category = (await sel.classifier.classify([TEST_FIELD])).get('t');
    if (!category) return { ok: false, reason: 'bad-response' };
    deps.authFailed.delete(s.provider);
    return { ok: true, category };
  } catch (e) {
    if (e instanceof HttpAuthError) {
      deps.authFailed.add(s.provider);
      return { ok: false, reason: 'auth' };
    }
    if (e instanceof HttpRequestError && (e.status === 400 || e.status === 422)) {
      return { ok: false, reason: 'rejected' };
    }
    return { ok: false, reason: 'network' };
  }
}

// Returns undefined for anything that is not exactly one of the AI request shapes.
export async function handleMessage(msg: unknown, deps: HandlerDeps): Promise<unknown> {
  const req = parseRequest(msg);
  if (!req) return undefined;
  const settings = await deps.loadSettings();

  switch (req.type) {
    case 'ai-status':
      return statusOf(deps, settings);
    case 'ai-download':
      return { started: settings.provider === 'built-in' && deps.lm ? await startDownload(deps.lm) : false };
    case 'ai-classify': {
      const sel = await selectClassifier(deps, settings);
      if (!sel.ok) return { ok: false };
      try {
        return { ok: true, entries: [...(await sel.classifier.classify(req.fields))] };
      } catch (e) {
        if (e instanceof HttpAuthError) deps.authFailed.add(settings.provider);
        return { ok: false };
      }
    }
    case 'ai-test':
      return runTest(deps, settings);
  }
}
