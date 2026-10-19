import type { AiStatusInfo, ProviderKind } from '../ai/types';
import { STATUS_TEXT } from '../ai/status-text';

export const PROVIDER_LABEL: Record<ProviderKind, string> = {
  none: 'オフ',
  'built-in': 'ブラウザ内蔵',
  openai: 'OpenAI 互換',
  gemini: 'Gemini',
};

export function badgeLabel(info: AiStatusInfo): string {
  // Provider-dependent by design (PBI-62 leaves this branch here): the table
  // covers every other status, so a new status only needs one table row.
  if (info.status === 'available') {
    return info.provider === 'openai' || info.provider === 'gemini'
      ? `AI: ${PROVIDER_LABEL[info.provider]}`
      : STATUS_TEXT.available.badge;
  }
  return STATUS_TEXT[info.status].badge;
}
