import { escapeHtml } from './markdown.ts';

// These mocks reproduce the extension's own (Japanese-only) UI, so the strings are not translated.
const e = escapeHtml;

export function mockButton(): string {
  return `<div class="mock" role="img" aria-label="${e('JushoAI で入力 / AI: オフ')}"><span class="mock-bar">${e('JushoAI で入力')}<span class="mock-badge">${e('AI: オフ')}</span></span></div>`;
}

const PREVIEW_ROWS: { label: string; value: string; ai: boolean }[] = [
  { label: '姓', value: '山田', ai: false },
  { label: '名', value: '太郎', ai: false },
  { label: 'セイ', value: 'ヤマダ', ai: false },
  { label: '郵便番号', value: '100-0001', ai: false },
  { label: '都道府県', value: '東京都', ai: false },
  { label: '市区町村・番地', value: '千代田区千代田1-1', ai: false },
  { label: 'Residence', value: '東京都千代田区千代田1-1 千代田ビル101', ai: true },
];

export function mockPreview(): string {
  const rows = PREVIEW_ROWS.map(
    (r) =>
      `<li><span class="k">${e(r.label)}</span><span>${e(r.value)}${r.ai ? `<span class="ai">${e('AI判定')}</span>` : ''}</span></li>`,
  ).join('');
  return `<div class="mock" role="img" aria-label="${e('入力内容の確認')}"><h4>${e('入力内容の確認')}</h4><ul>${rows}</ul><div class="mock-actions"><span class="mock-btn">${e('キャンセル')}</span><span class="mock-btn primary">${e('入力する')}</span></div></div>`;
}

export function mockGuide(): string {
  return `<div class="mock" role="img" aria-label="${e('AI 判定はオフです')}"><h4>${e('AI 判定はオフです')}</h4><p>${e('ルールで判定できない欄だけ AI で補助できます。設定ページで AI プロバイダを選んでください。')}</p><p>${e('ルールによる入力は AI なしでも使えます。')}</p><div class="mock-actions"><span class="mock-btn primary">${e('AI 設定を開く')}</span><span class="mock-btn">${e('閉じる')}</span></div></div>`;
}

const FORM_FIELDS: { label: string; placeholder: string; value: string }[] = [
  { label: '姓', placeholder: '山田', value: '山田' },
  { label: '名', placeholder: '太郎', value: '太郎' },
  { label: 'セイ', placeholder: 'ヤマダ', value: 'ヤマダ' },
  { label: 'メイ', placeholder: 'ﾀﾛｳ', value: 'ﾀﾛｳ' },
  { label: '郵便番号', placeholder: '123-4567', value: '100-0001' },
  { label: '電話番号', placeholder: '09012345678', value: '09012345678' },
];

export function mockForm(filled: boolean, caption: string): string {
  const cell = (f: (typeof FORM_FIELDS)[number]) =>
    `<label>${e(f.label)}<span class="field ${filled ? 'filled' : 'empty'}">${e(filled ? f.value : f.placeholder)}</span></label>`;
  const [a, b, c, d, ...rest] = FORM_FIELDS;
  return `<div class="mock" role="img" aria-label="${e(caption)}"><h4>${e('お申し込み')}</h4><div class="mock-split">${cell(a!)}${cell(b!)}</div><div class="mock-split">${cell(c!)}${cell(d!)}</div>${rest.map(cell).join('')}</div>`;
}
