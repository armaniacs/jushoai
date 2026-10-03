import type { AiStatusInfo, ProviderKind } from '../ai/types';

export const PROVIDER_LABEL: Record<ProviderKind, string> = {
  none: 'オフ',
  'built-in': 'ブラウザ内蔵',
  openai: 'OpenAI 互換',
  gemini: 'Gemini',
};

export function badgeLabel(info: AiStatusInfo): string {
  switch (info.status) {
    case 'available':
      return info.provider === 'openai' || info.provider === 'gemini'
        ? `AI: ${PROVIDER_LABEL[info.provider]}`
        : 'AI 有効';
    case 'downloadable':
      return 'AI 未準備';
    case 'downloading':
      return 'AI 準備中';
    case 'unavailable':
    case 'unsupported':
      return 'AI 無効';
    case 'disabled':
      return 'AI: オフ';
    case 'not-configured':
      return 'AI 未設定';
    case 'permission-missing':
      return 'AI 権限なし';
    case 'auth-error':
      return 'AI 認証エラー';
  }
}
