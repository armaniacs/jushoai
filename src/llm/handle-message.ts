import { AuditedClassifier } from '../ai/audited-classifier';
import type { AuditPurpose, AuditRecorder } from '../ai/audit-log';
import { createGeminiClassifier, createOpenAiClassifier, HttpAuthError, HttpRequestError, isRejectedStatus } from '../ai/http-classifiers';
import { originPatternsFor } from '../ai/permissions';
import { validateAiSettings, type EgressCheck } from '../ai/settings';
import { computeCloudStatus } from '../ai/status';
import { GEMINI_BASE_URL, type AiStatusInfo, type ProviderKind, type PublicAiSettings } from '../ai/types';
import { sanitizePageUrl } from '../feedback/issue-url';
import type { FieldMeta } from '../core/types';
import type { FieldClassifier } from '../core/classifier';
import { parseRequest, type TestResponse } from '../messages';
import { checkAiStatus, startDownload, type LanguageModelStatic } from './availability';
import { PromptApiClassifier } from './classifier';

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
  // Dial-time egress gate owned by the caller (the background builds one per SW
  // lifetime, so its DoH TTL cache spans classify messages); the classifier factory
  // wires a DoH default when absent.
  egress?: EgressCheck;
  audit: AuditRecorder;
}

// Where the page that triggered the call lives; taken from the sender, never from the message.
export interface CallContext {
  pageUrl?: string;
}

type Selection =
  | { ok: true; classifier: FieldClassifier }
  | { ok: false; reason: 'not-configured' | 'permission' | 'auth' | 'unavailable' };

async function statusOf(
  deps: HandlerDeps,
  s: PublicAiSettings,
  secrets?: { openai?: string; gemini?: string },
): Promise<AiStatusInfo> {
  if (s.provider === 'built-in') return { status: await checkAiStatus(deps.lm), provider: 'built-in' };
  let hasKey = s.hasKey;
  // An envelope that no longer decrypts is the same as no key.
  if ((s.provider === 'openai' || s.provider === 'gemini') && hasKey[s.provider]) {
    const sec = secrets ?? (await deps.loadSecrets());
    if (sec[s.provider] === undefined) hasKey = { ...hasKey, [s.provider]: false };
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

const hostOf = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

function auditTarget(s: PublicAiSettings): { host: string; model: string } {
  if (s.provider === 'openai') return { host: hostOf(s.openai.baseUrl), model: s.openai.model };
  if (s.provider === 'gemini') return { host: hostOf(GEMINI_BASE_URL), model: s.gemini.model };
  return { host: '', model: '' };
}

async function selectClassifier(
  deps: HandlerDeps,
  s: PublicAiSettings,
  opts: { purpose: AuditPurpose; pageUrl: string; ignoreAuthFailure?: boolean },
): Promise<Selection> {
  const sel = await selectRaw(deps, s, opts);
  if (!sel.ok) return sel;
  const ctx = { provider: s.provider, ...auditTarget(s), purpose: opts.purpose, pageUrl: opts.pageUrl };
  return { ok: true, classifier: new AuditedClassifier(sel.classifier, ctx, deps.audit) };
}

async function selectRaw(
  deps: HandlerDeps,
  s: PublicAiSettings,
  opts: { ignoreAuthFailure?: boolean },
): Promise<Selection> {
  const secrets = await deps.loadSecrets();
  const { status } = await statusOf(deps, s, secrets);
  if (status === 'disabled' || status === 'not-configured') return { ok: false, reason: 'not-configured' };
  if (status === 'permission-missing') return { ok: false, reason: 'permission' };
  if (status === 'auth-error' && !opts.ignoreAuthFailure) return { ok: false, reason: 'auth' };

  if (s.provider === 'built-in') {
    if (!deps.lm || status !== 'available') return { ok: false, reason: 'unavailable' };
    return { ok: true, classifier: new PromptApiClassifier(deps.lm) };
  }

  const present = { openai: secrets.openai !== undefined, gemini: secrets.gemini !== undefined };
  // The stored key can be unreadable even though an envelope exists; treat that as not configured.
  if (validateAiSettings(s, present).length > 0) return { ok: false, reason: 'not-configured' };
  if (s.provider === 'openai') {
    return { ok: true, classifier: createOpenAiClassifier(s.openai, secrets.openai, {
        fetch: deps.fetch,
        egress: deps.egress,
      }, {
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
  const sel = await selectClassifier(deps, s, { purpose: 'connection-test', pageUrl: '', ignoreAuthFailure: true });
  if (!sel.ok) return sel;
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
    if (e instanceof HttpRequestError && isRejectedStatus(e.status)) {
      return { ok: false, reason: 'rejected' };
    }
    return { ok: false, reason: 'network' };
  }
}

// Returns undefined for anything that is not exactly one of the AI request shapes.
export async function handleMessage(msg: unknown, deps: HandlerDeps, ctx: CallContext = {}): Promise<unknown> {
  const req = parseRequest(msg);
  if (!req) return undefined;
  const settings = await deps.loadSettings();

  switch (req.type) {
    case 'ai-status':
      return statusOf(deps, settings);
    case 'ai-download':
      return { started: settings.provider === 'built-in' && deps.lm ? await startDownload(deps.lm) : false };
    case 'ai-classify': {
      const sel = await selectClassifier(deps, settings, {
        purpose: 'classify',
        pageUrl: ctx.pageUrl ? sanitizePageUrl(ctx.pageUrl) : '',
      });
      // The caller chooses its error display from the reason, so never drop it.
      if (!sel.ok) return { ok: false, reason: sel.reason };
      try {
        return { ok: true, entries: [...(await sel.classifier.classify(req.fields, req.chunk))] };
      } catch (e) {
        if (e instanceof HttpAuthError) {
          deps.authFailed.add(settings.provider);
          return { ok: false, reason: 'auth' };
        }
        if (e instanceof HttpRequestError && isRejectedStatus(e.status)) {
          return { ok: false, reason: 'rejected' };
        }
        if (e instanceof HttpRequestError) return { ok: false, reason: 'network' };
        return { ok: false, reason: 'bad-response' };
      }
    }
    case 'ai-test':
      return runTest(deps, settings);
  }
}
