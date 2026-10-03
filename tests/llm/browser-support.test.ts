import { describe, it, expect } from 'vitest';
import { detectBrowser, getFlagGuidance } from '../../src/llm/browser-support';

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';

describe('detectBrowser', () => {
  it('detects chrome, edge and unknown', () => {
    expect(detectBrowser(CHROME)).toBe('chrome');
    expect(detectBrowser(`${CHROME} Edg/150.0.0.0`)).toBe('edge');
    expect(detectBrowser(`${CHROME} OPR/110.0.0.0`)).toBe('unknown');
    expect(detectBrowser('Mozilla/5.0 Firefox/130.0')).toBe('unknown');
    expect(detectBrowser('')).toBe('unknown');
  });
});

describe('getFlagGuidance', () => {
  it('returns flag info per browser', () => {
    expect(getFlagGuidance('chrome')).toEqual({
      flagUrl: 'chrome://flags/#prompt-api-for-gemini-nano',
      flagName: 'Prompt API for Gemini Nano',
    });
    expect(getFlagGuidance('edge')).toEqual({
      flagUrl: 'edge://flags/#edge-llm-prompt-api-for-phi-mini',
      flagName: 'Prompt API for on-device language model',
    });
    expect(getFlagGuidance('unknown')).toBeNull();
  });
});
