export type BrowserKind = 'chrome' | 'edge' | 'unknown';

export interface FlagGuidance {
  flagUrl: string;
  flagName: string;
}

export function detectBrowser(userAgent: string): BrowserKind {
  if (userAgent.includes('Edg/')) return 'edge';
  if (userAgent.includes('Chrome/') && !/OPR\/|Brave|Vivaldi|SamsungBrowser|YaBrowser/.test(userAgent)) {
    return 'chrome';
  }
  return 'unknown';
}

export function getFlagGuidance(browser: BrowserKind): FlagGuidance | null {
  switch (browser) {
    case 'chrome':
      return { flagUrl: 'chrome://flags/#prompt-api-for-gemini-nano', flagName: 'Prompt API for Gemini Nano' };
    case 'edge':
      return {
        flagUrl: 'edge://flags/#edge-llm-prompt-api-for-phi-mini',
        flagName: 'Prompt API for on-device language model',
      };
    default:
      return null;
  }
}
