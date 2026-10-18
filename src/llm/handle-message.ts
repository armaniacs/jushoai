import type { PublicAiSettings } from '../ai/types';
import { isSecretAuthError } from '../ai/secret-store';
import { decodeRequest } from '../messages';
import type { ProviderRegistry, RegistrySecrets } from './provider-registry';

export interface HandlerDeps {
  registry: ProviderRegistry;
  loadSettings(): Promise<PublicAiSettings>;
  loadSecrets(): Promise<RegistrySecrets>;
}

// Where the page that triggered the call lives; taken from the sender, never from the message.
export interface CallContext {
  pageUrl?: string;
}

// The key bodies are only loaded when the selected provider needs one: a
// status check with no stored key must not trigger a decryption attempt.
const needsSecrets = (s: PublicAiSettings): boolean =>
  (s.provider === 'openai' || s.provider === 'gemini') && s.hasKey[s.provider];

// A corrupt key envelope must not collapse into an undistinguishable silence
// (the background would answer undefined and the gateway read null): report
// it as an auth failure in the same vocabulary the gateway already parses.
// Only the envelope shape means the key itself is bad; an IDB blocked open or
// an aborted transaction is an operational hiccup, so it travels as a
// transient failure and never as a rejected key.
async function secretsOrAuthFailure(
  deps: HandlerDeps,
): Promise<{ secrets: RegistrySecrets } | { failure: 'auth' | 'transient' }> {
  try {
    return { secrets: await deps.loadSecrets() };
  } catch (e) {
    return { failure: isSecretAuthError(e) ? 'auth' : 'transient' };
  }
}

async function loadNeededSecrets(
  settings: PublicAiSettings,
  deps: HandlerDeps,
): Promise<{ secrets: RegistrySecrets | undefined } | { failure: 'auth' | 'transient' }> {
  if (!needsSecrets(settings)) return { secrets: undefined };
  const r = await secretsOrAuthFailure(deps);
  return 'failure' in r ? r : { secrets: r.secrets };
}

// Thin message dispatch over the provider registry: shape parsing lives here,
// provider resolution, memory, audit wrap, and error vocabulary live behind
// the registry seam. Returns undefined for anything that is not exactly one of
// the AI request shapes.
export async function handleMessage(msg: unknown, deps: HandlerDeps, ctx: CallContext = {}): Promise<unknown> {
  const req = decodeRequest(msg);
  if (!req) return undefined;
  const settings = await deps.loadSettings();

  switch (req.type) {
    case 'ai-status': {
      const r = await loadNeededSecrets(settings, deps);
      if ('failure' in r) {
        return r.failure === 'auth'
          ? { status: 'auth-error', provider: settings.provider }
          : { status: 'unavailable', provider: settings.provider };
      }
      return deps.registry.status(settings, r.secrets);
    }
    case 'ai-download':
      return deps.registry.download(settings);
    case 'ai-classify': {
      // Keyless providers (none / built-in) classify without touching the key
      // store: decrypting here would load key material for no reason and fail
      // closed paths (e.g. a corrupt envelope) would take built-in down too.
      const r = await loadNeededSecrets(settings, deps);
      if ('failure' in r) return { ok: false, reason: r.failure === 'auth' ? 'auth' : 'unavailable' };
      return deps.registry.classify(settings, r.secrets, req.fields, {
        purpose: 'classify',
        pageUrl: ctx.pageUrl,
        ...(req.chunk ? { chunk: req.chunk } : {}),
      });
    }
    case 'ai-test': {
      const r = await loadNeededSecrets(settings, deps);
      if ('failure' in r) return { ok: false, reason: r.failure === 'auth' ? 'auth' : 'unavailable' };
      return deps.registry.test(settings, r.secrets);
    }
    case 'open-options':
    case 'audit-clear':
      // Owned by the background listener, which branches before delegating
      // here; reaching this point means a wiring change upstream.
      return undefined;
    default: {
      // Unreachable while every AiRequest variant has a case above: adding a
      // request type without handling it here turns into a compile error.
      const exhaustive: never = req;
      return exhaustive;
    }
  }
}
