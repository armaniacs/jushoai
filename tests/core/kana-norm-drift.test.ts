// Regression test for the kana-module NFKC drift (maintainability finding C):
// detectKanaKind used to read the raw placeholder while wantsKana reads norm(),
// so a placeholder that is kana-only only after NFKC composition got the
// fallback kind. detectKanaKind now shares the normalized view (half-width
// katakana still branches on the raw string, since NFKC full-widths ｦ-ﾟ).
// Fixtures use tests/helpers makeMeta per project policy.
import { describe, expect, it } from 'vitest';
import { formatKana } from '../../src/core/formatters';
import { detectKanaKind, resolveKana } from '../../src/core/kana';
import { classifyField } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';

// Combining voiced sound mark: NFD-style text (macOS copy-paste, PDF
// extraction) that NFKC composes into precomposed kana.
const VOICED = String.fromCharCode(0x3099);
const HIRA_DECOMPOSED = `か${VOICED}な`; // == 'がな' after NFKC
const KATA_DECOMPOSED = `カ${VOICED}ナ`; // == 'ガナ' after NFKC

describe('kana NFKC drift (repro)', () => {
  it('detects hiragana through a combining voiced mark', () => {
    expect(HIRA_DECOMPOSED.normalize('NFKC')).toBe('がな');
    expect(detectKanaKind(makeMeta({ placeholder: HIRA_DECOMPOSED }))).toBe('hiragana');
  });

  it('attributes hiragana kind end-to-end for decomposed-hiragana fields', () => {
    const meta = makeMeta({ id: 'a', autocomplete: 'family-name', label: '名前', placeholder: HIRA_DECOMPOSED });
    const cls = classifyField(meta)!;
    expect(cls.category).toBe('lastName');
    const [item] = resolveKana([{ meta, cls }]);
    expect(item!.cls.category).toBe('lastNameKana');
    expect(item!.cls.kanaKind).toBe('hiragana');
    // Consequence: the filler renders the stored kana value in the wrong script.
    expect(formatKana('ガナ', item!.cls.kanaKind ?? 'katakana')).toBe('がな');
  });

  it('keeps katakana for decomposed-katakana placeholders (control)', () => {
    expect(KATA_DECOMPOSED.normalize('NFKC')).toBe('ガナ');
    expect(detectKanaKind(makeMeta({ placeholder: KATA_DECOMPOSED }))).toBe('katakana');
  });
});

describe('pattern-text kana ranges (widened matchers)', () => {
  it('reads hiragana from a hiragana range inside the pattern text', () => {
    expect(detectKanaKind(makeMeta({ pattern: '[か-こ]+' }))).toBe('hiragana');
  });

  it('reads katakana from a katakana range inside the pattern text', () => {
    expect(detectKanaKind(makeMeta({ pattern: '[ア-オ]+' }))).toBe('katakana');
  });

  it('reads half-width katakana from a half-width range inside the pattern text', () => {
    expect(detectKanaKind(makeMeta({ pattern: '[ｱ-ﾝ]+' }))).toBe('halfKatakana');
  });
});
