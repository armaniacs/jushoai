import { AuditedClassifier } from '../ai/audited-classifier';
import { capAuditPageUrl, type AuditPurpose, type AuditRecorder } from '../ai/audit-log';
import { createGeminiClassifier, createOpenAiClassifier, HttpAuthError, HttpRequestError, isRejectedStatus } from '../ai/http-classifiers';
import { requiredHostOrigins } from '../ai/permissions';
import { validateAiSettings, type EgressCheck } from '../ai/settings';
import { computeCloudStatus } from '../ai/status';
import { GEMINI_BASE_URL, type AiStatusInfo, type ProviderKind, type PublicAiSettings } from '../ai/types';
import { sanitizePageUrl } from '../feedback/issue-url';
import type { ClassifySchedule, FieldClassifier } from '../core/classifier';
import type { FieldMeta } from '../core/types';
import { checkAiStatus, startDownload, type LanguageModelStatic } from './availability';
import { PromptApiClassifier } from './classifier';
import type { ClassifyResponse, TestResponse } from '../messages';

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
  audit: AuditRecorder;
}

// Provider memory with registry-local lifetime semantics: read and written only
// through the selection below, cleared as one unit by invalidate() when the
// settings change. The containers may be injected (background, tests) so
// long-lived observers keep working; the lifecycle decisions live here.
export interface RegistryMemory {
  authFailed: Set<ProviderKind>;
  compat: Set<ProviderKind>;
}

export interface RegistrySecrets {
  openai?: string;
  gemini?: string;
}

type Selection =
  | { ok: true; classifier: FieldClassifier }
  | { ok: false; reason: 'not-configured' | 'permission' | 'auth' | 'unavailable' };

const TEST_FIELD: FieldMeta = {
  id: 't', tag: 'input', type: 'text', name: 'name', htmlId: '', autocomplete: '', label: 'お名前',
  placeholder: '山田 太郎', nearby: '', maxLength: null, pattern: '', options: [], readOnly: false,
  disabled: false, value: '',
};

// The provider-resolution module: status, adapter selection, the auth/compat
// memory, the audit wrap, and the error-vocabulary mapping live behind this one
// interface. Adding a provider is one entry in selectRaw plus its factory, not
// a five-file edit across status, settings, permissions, handler, and background.
export class ProviderRegistry {
  constructor(
    private readonly env: RegistryEnv,
    private readonly memory: RegistryMemory = { authFailed: new Set(), compat: new Set() },
  ) {}

  // Changing the settings (a new key, another provider) gives a failed or
  // compat-mode provider a fresh start. The background calls this on the same
  // storage trigger that used to clear the bare sets.
  invalidate(): void {
    this.memory.authFailed.clear();
    this.memory.compat.clear();
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
        authFailed: this.memory.authFailed.has(s.provider),
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

  async classify(
    s: PublicAiSettings,
    secrets: RegistrySecrets | undefined,
    fields: FieldMeta[],
    opts: { purpose: AuditPurpose; pageUrl?: string; chunk?: ClassifySchedule },
  ): Promise<ClassifyResponse> {
    const sel = await this.select(s, secrets, {
      purpose: opts.purpose,
      // Where the page that triggered the call lives; taken from the sender, never from the message.
      pageUrl: opts.pageUrl ? capAuditPageUrl(sanitizePageUrl(opts.pageUrl)) : '',
    });
    // The caller chooses its error display from the reason, so never drop it.
    if (!sel.ok) return { ok: false, reason: sel.reason };
    try {
      return { ok: true, entries: [...(await sel.classifier.classify(fields, opts.chunk))] };
    } catch (e) {
      if (e instanceof HttpAuthError) {
        this.memory.authFailed.add(s.provider);
        return { ok: false, reason: 'auth' };
      }
      if (e instanceof HttpRequestError && isRejectedStatus(e.status)) {
        return { ok: false, reason: 'rejected' };
      }
      if (e instanceof HttpRequestError) return { ok: false, reason: 'network' };
      return { ok: false, reason: 'bad-response' };
    }
  }

  async test(s: PublicAiSettings, secrets: RegistrySecrets | undefined): Promise<TestResponse> {
    const sel = await this.select(s, secrets, { purpose: 'connection-test', pageUrl: '', ignoreAuthFailure: true });
    if (!sel.ok) return sel;
    try {
      const category = (await sel.classifier.classify([TEST_FIELD])).get('t');
      if (!category) return { ok: false, reason: 'bad-response' };
      this.memory.authFailed.delete(s.provider);
      return { ok: true, category };
    } catch (e) {
      if (e instanceof HttpAuthError) {
        this.memory.authFailed.add(s.provider);
        return { ok: false, reason: 'auth' };
      }
      if (e instanceof HttpRequestError && isRejectedStatus(e.status)) {
        return { ok: false, reason: 'rejected' };
      }
      return { ok: false, reason: 'network' };
    }
  }
}
