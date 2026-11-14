import { normalizeExclusionEntry } from './exclusions';

export type ExclusionCandidates =
  | { ok: true; exact: string; prefix: string }
  | { ok: false; reason: string };

export function buildExclusionCandidates(href: string): ExclusionCandidates {
  const exact = normalizeExclusionEntry(href);
  if (!exact.ok) return exact;
  let url: URL;
  try {
    url = new URL(exact.value);
  } catch {
    return { ok: false, reason: 'URL の形式が正しくありません' };
  }
  const first = url.pathname.split('/').filter((part) => part !== '')[0];
  const prefix = first ? `${url.origin}/${first}/` : `${url.origin}/`;
  return { ok: true, exact: exact.value, prefix };
}
