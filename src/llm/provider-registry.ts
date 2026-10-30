import { AuditedClassifier, type TracedClassifier } from '../ai/audited-classifier';
import { capAuditPageUrl, minimizeAuditPageUrl, type AuditPurpose, type AuditRecorder } from '../ai/audit-log';
import { createGeminiClassifier, createOpenAiClassifier, HttpAuthError, HttpRequestError, isRejectedStatus } from '../ai/http-classifiers';
import { originOf } from '../ai/key-reentry';
import type { FirstDialVerdict } from '../ai/first-dial';
import { requiredHostOrigins } from '../ai/permissions';
import { validateAiSettings, type EgressCheck } from '../ai/settings';
import { computeCloudStatus } from '../ai/status';
import { GEMINI_BASE_URL, type AiStatusInfo, type ProviderKind, type PublicAiSettings } from '../ai/types';
import type { ClassifySchedule } from '../core/classifier';
import type { FieldMeta } from '../core/types';
import { asClassifyFailure } from '../messages';
import { checkAiStatus, startDownload, type LanguageModelStatic } from './availability';
import { createAuthBlock, type AuthBlock } from './auth-block';
import { PromptApiClassifier } from './classifier';
import type { ClassifyResponse, TestFailure, TestResponse } from '../messages';

// Narrow environment: values and capabilities only, no loaders. The background
// owns the loaders and their caches; every method below takes already-loaded
// settings and secrets so tests pass plain values. The LanguageModel accessor
// stays a thunk because globalThis.LanguageModel can appear after setup
// (flag flip, late download); capturing it once would go stale.
export interface RegistryEnv {
  getLanguageModel(): LanguageModelStatic | null;
  hasPermission(origins: string[]): Promise<boolean>;
  fetch: typeof fetch;
  // Dial-time resolved-address gate; the OpenAI factory wires a DoH-based default.
  egress?: EgressCheck;
  // First-dial confirmation gate: classify/test dial a cloud origin only after
  // the user confirmed it in the settings page (trust-on-first-use, VULN-001).
  firstDial?: (origin: string) => Promise<FirstDialVerdict>;
  audit: AuditRecorder;
}

// Provider memory with registry-local lifetime semantics: read and written only
// through the selection below, cleared as one unit by invalidate() when the
// settings change. The containers may be injected (background, tests) so
// long-lived observers keep working; the lifecycle decisions live here.
// NOTE: entries seeded from outside (injected pre-filled sets) carry no
// timestamp and never expire; only failures recorded here self-heal.
export interface RegistryMemory {
  authFailed: Set<ProviderKind>;
  compat: Set<ProviderKind>;
}

export interface RegistrySecrets {
  openai?: string;
  gemini?: string;
}

type Selection =
  | { ok: true; classifier: TracedClassifier }
  | { ok: false; reason: 'not-configured' | 'permission' | 'auth' | 'unavailable' | 'first-dial' };

const TEST_FIELD: FieldMeta = {
  id: 't', tag: 'input', type: 'text', name: 'name', htmlId: '', autocomplete: '', label: 'お名前',
  placeholder: '山田 太郎', nearby: '', maxLength: null, pattern: '', options: [], readOnly: false,
  disabled: false, value: '',
};

// Route of one provider attempt; the parameter that selects the unknown-error
// row below (PBI-192).
type FailureRoute = 'classify' | 'test';

// Route-specific outcome table (PBI-192): the historical asymmetry as one row
// per route instead of a call-site comment. classify() folds unknown errors to
// 'bad-response' (the analyze contract folds out-of-vocabulary reasons there
// too); the connection test has always reported them as 'network' — its
// callers read 'network' as "the endpoint did not answer". 401/403 ('auth')
// and rejected shapes ('rejected') share one mapping regardless of route.
const UNKNOWN_FAILURE_BY_ROUTE: Record<FailureRoute, TestFailure> = {
  classify: 'bad-response',
  test: 'network',
};

// The provider-resolution module: status, adapter selection, the auth/compat
// memory, the audit wrap, and the error-vocabulary mapping live behind this one
// interface. Adding a provider is one entry in selectRaw plus its factory, not
// a five-file edit across status, settings, permissions, handler, and background.
export class ProviderRegistry {
  constructor(
    private readonly env: RegistryEnv,
    private readonly memory: RegistryMemory = { authFailed: new Set(), compat: new Set() },
  ) {
    this.authBlock = createAuthBlock(memory.authFailed);
  }

  private readonly authBlock: AuthBlock;

  // Changing the settings (a new key, another provider) gives a failed or
  // compat-mode provider a fresh start. The background calls this on the same
  // storage trigger that used to clear the bare sets.
  invalidate(): void {
    this.memory.authFailed.clear();
    this.memory.compat.clear();
    this.authBlock.clearAll();
  }

  private async statusOf(s: PublicAiSettings, secrets?: RegistrySecrets): Promise<AiStatusInfo> {
    if (s.provider === 'built-in') {
      return { status: await checkAiStatus(this.env.getLanguageModel()), provider: 'built-in' };
    }
    let hasKey = s.hasKey;
    // An envelope that no longer decrypts is the same as no key.
    if ((s.provider === 'openai' || s.provider === 'gemini') && hasKey[s.provider]) {
      if (secrets?.[s.provider] === undefined) hasKey = { ...hasKey, [s.provider]: false };
    }
    return {
      status: computeCloudStatus({
        settings: s,
        hasKey,
        permitted: await this.env.hasPermission(requiredHostOrigins(s)),
        authFailed: this.authBlock.isBlocked(s.provider),
      }),
      provider: s.provider,
    };
  }

  async status(s: PublicAiSettings, secrets?: RegistrySecrets): Promise<AiStatusInfo> {
    return this.statusOf(s, secrets);
  }

  async download(s: PublicAiSettings): Promise<{ started: boolean }> {
    const lm = this.env.getLanguageModel();
    return { started: s.provider === 'built-in' && lm ? await startDownload(lm) : false };
  }

  private hostOf(url: string) {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }

  private auditTarget(s: PublicAiSettings): { host: string; model: string } {
    if (s.provider === 'openai') return { host: this.hostOf(s.openai.baseUrl), model: s.openai.model };
    if (s.provider === 'gemini') return { host: this.hostOf(GEMINI_BASE_URL), model: s.gemini.model };
    return { host: '', model: '' };
  }

  private async select(
    s: PublicAiSettings,
    secrets: RegistrySecrets | undefined,
    opts: { purpose: AuditPurpose; pageUrl: string; ignoreAuthFailure?: boolean },
  ): Promise<Selection> {
    const sel = await this.selectRaw(s, secrets, opts);
    if (!sel.ok) return sel;
    const ctx = { provider: s.provider, ...this.auditTarget(s), purpose: opts.purpose, pageUrl: opts.pageUrl };
    return { ok: true, classifier: new AuditedClassifier(sel.classifier, ctx, this.env.audit) };
  }

  private async selectRaw(
    s: PublicAiSettings,
    secrets: RegistrySecrets | undefined,
    opts: { ignoreAuthFailure?: boolean },
  ): Promise<Selection> {
    const { status } = await this.statusOf(s, secrets);
    if (status === 'disabled' || status === 'not-configured') return { ok: false, reason: 'not-configured' };
    if (status === 'permission-missing') return { ok: false, reason: 'permission' };
    if (status === 'auth-error' && !opts.ignoreAuthFailure) return { ok: false, reason: 'auth' };

    if (s.provider === 'built-in') {
      const lm = this.env.getLanguageModel();
      if (!lm || status !== 'available') return { ok: false, reason: 'unavailable' };
      return { ok: true, classifier: new PromptApiClassifier(lm) };
    }

    const present = { openai: secrets?.openai !== undefined, gemini: secrets?.gemini !== undefined };
    // The stored key can be unreadable even though an envelope exists; treat that as not configured.
    if (validateAiSettings(s, present).length > 0) return { ok: false, reason: 'not-configured' };
    if (s.provider === 'openai') {
      // First-dial confirmation: nothing dials an origin the user has not confirmed
      // (VULN-001). The gate runs before the classifier is created, so the dial
      // path is never entered for an unconfirmed origin.
      if (this.env.firstDial) {
        const origin = originOf(s.openai.baseUrl);
        if (origin !== null && !(await this.env.firstDial(origin)).ok) {
          return { ok: false, reason: 'first-dial' };
        }
      }
      return { ok: true, classifier: createOpenAiClassifier(s.openai, secrets?.openai, {
          fetch: this.env.fetch,
          egress: this.env.egress,
        }, {
          compat: this.memory.compat.has('openai'),
          onCompat: () => this.memory.compat.add('openai'),
        }) };
    }
    if (s.provider === 'gemini' && secrets?.gemini) {
      // No egress gate: the reason is recorded at createGeminiClassifier, not here.
      return { ok: true, classifier: createGeminiClassifier(s.gemini, secrets.gemini, { fetch: this.env.fetch }) };
    }
    return { ok: false, reason: 'not-configured' };
  }

  // PBI-192: one fold of a failed provider attempt into its wire response.
  // HttpAuthError records the provider and returns 'auth' from this single
  // place — the former call sites (classify's attempt arm, classify's catch
  // arm, test's catch arm) each repeated the same two lines, and the
  // authFailed bookkeeping had to stay in lockstep with the 'auth' reason it
  // is paired with. The record keeps its instanceof check: an adapter that
  // returns a failureReason of 'auth' without throwing must not record, so a
  // reason-string check here would be wrong. null means not an auth failure;
  // each caller keeps its own remaining vocabulary.
  private authFailure(e: unknown, provider: ProviderKind): { ok: false; reason: TestFailure } | null {
    if (e instanceof HttpAuthError) {
      this.authBlock.record(provider);
      return { ok: false, reason: 'auth' };
    }
    return null;
  }

  // Single source of the throw-path failure vocabulary: classify() and test()
  // share the 401/403 and rejected-shape rows; only the unknown row is
  // route-specific (UNKNOWN_FAILURE_BY_ROUTE, pinned by tests). Auth recording
  // lives in authFailure, so this mapping is only reached after that fold
  // returned null; the HttpAuthError arm stays so a future call site that
  // skips the fold still gets the right reason. Success-path bookkeeping
  // (authFailed add/delete) stays with each caller. ClassifyFailure and
  // TestFailure are the same literal set under two names, so this return type
  // satisfies both wire shapes.
  private mapFailure(e: unknown, route: FailureRoute): TestFailure {
    if (e instanceof HttpAuthError) return 'auth';
    if (e instanceof HttpRequestError && isRejectedStatus(e.status)) return 'rejected';
    if (e instanceof HttpRequestError) return 'network';
    return UNKNOWN_FAILURE_BY_ROUTE[route];
  }

  async classify(
    s: PublicAiSettings,
    secrets: RegistrySecrets | undefined,
    fields: FieldMeta[],
    opts: { purpose: AuditPurpose; pageUrl?: string; chunk?: ClassifySchedule },
  ): Promise<ClassifyResponse> {
    const sel = await this.select(s, secrets, {
      purpose: opts.purpose,
      // Where the page that triggered the call lives; taken from the sender, never from the message.
      // Only the origin is kept: path/query/fragment can carry tokens and the
      // audit host column already identifies the destination.
      pageUrl: opts.pageUrl ? capAuditPageUrl(minimizeAuditPageUrl(opts.pageUrl)) : '',
    });
    // The caller chooses its error display from the reason, so never drop it.
    if (!sel.ok) return { ok: false, reason: sel.reason };
    // PBI-174: attempt 委譲。throw 経路 (classify) は test 専用化し、classify
    // 応答は attempt 戻り値から組み立てる。語彙の正準は adapter 側の
    // failureReason (asClassifyFailure で畳む) で、throw 時の backstop だけが
    // mapFailure に残る。
    try {
      const outcome = await sel.classifier.attempt(fields, opts.chunk);
      if (outcome.error !== undefined) {
        const auth = this.authFailure(outcome.error, s.provider);
        if (auth) return auth;
        return { ok: false, reason: asClassifyFailure(outcome.failureReason) ?? 'bad-response' };
      }
      return { ok: true, entries: [...outcome.map] };
    } catch (e) {
      const auth = this.authFailure(e, s.provider);
      if (auth) return auth;
      return { ok: false, reason: this.mapFailure(e, 'classify') };
    }
  }

  async test(s: PublicAiSettings, secrets: RegistrySecrets | undefined): Promise<TestResponse> {
    const sel = await this.select(s, secrets, { purpose: 'connection-test', pageUrl: '', ignoreAuthFailure: true });
    if (!sel.ok) return sel;
    try {
      const category = (await sel.classifier.classify([TEST_FIELD])).get('t');
      if (!category) return { ok: false, reason: 'bad-response' };
      this.authBlock.clear(s.provider);
      return { ok: true, category };
    } catch (e) {
      const auth = this.authFailure(e, s.provider);
      if (auth) return auth;
      return { ok: false, reason: this.mapFailure(e, 'test') };
    }
  }
}
