// Suspect metadata detection (PBI-124): flags page-controlled strings that
// look like they carry personal data themselves. A page that prints names,
// addresses, phone numbers or emails into labels/headings sends those strings
// to the AI provider, so the egress gate warns before sending. Warn-only by
// design: false positives just show an excludable warning, so the patterns
// bias toward catching value-like text over avoiding false alarms.
const EMAIL_RE = /[\w.%+-]+@[\w-]+\.[\w.-]+/;
const PHONE_RE = /0\d{1,4}[-(‐ー－]\d{1,4}[-)‐ー－]?\d{3,4}|0\d{9,10}/;
const POSTAL_RE = /\d{3}-\d{4}/;
// A kanji run followed by digits reads as a street address (千代田1-1).
const ADDRESS_RE = /[一-龥]{2,}[0-9０-９]+[-0-9０-９]*/;
// Two kanji runs separated by a space read as a full name (山田 太郎).
const NAME_RE = /[一-龥]{1,5}[ \u3000][一-龥]{1,5}/;
// Two katakana runs separated by a space read as a kana name (ヤマダ タロウ) —
// common in labels like フリガナ（ヤマダ タロウ）.
const KANA_NAME_RE = /[ァ-ヶ]{2,10}[ \u3000][ァ-ヶ]{2,10}/;

export function suspectPii(text: string): boolean {
  return (
    EMAIL_RE.test(text) ||
    PHONE_RE.test(text) ||
    POSTAL_RE.test(text) ||
    ADDRESS_RE.test(text) ||
    NAME_RE.test(text) ||
    KANA_NAME_RE.test(text)
  );
}
