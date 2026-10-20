import { describe, it, expect } from 'vitest';
import { AI_STATUSES } from '../../src/llm/availability';
import { CLOUD_STATUSES } from '../../src/ai/types';
import { STATUS_TEXT } from '../../src/ai/status-text';

// PBI-62: every AiState has wording on every surface. Adding a status without
// a table row is a compile error (Record<AiState>), not a silent gap.
describe('STATUS_TEXT', () => {
  it('covers every AiState with a non-empty badge and guide title', () => {
    for (const status of [...AI_STATUSES, ...CLOUD_STATUSES] as const) {
      expect(STATUS_TEXT[status].badge, status).not.toBe('');
      expect(STATUS_TEXT[status].guideTitle, status).not.toBe('');
    }
  });
});
