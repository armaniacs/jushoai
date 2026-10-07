import { describe, it, expect } from 'vitest';
import { classifyField } from '../../src/core/classify-rules';
import { makeMeta } from '../helpers';

describe('optional "if different" name fields', () => {
  it.each([
    'First name on ID (if different from above) If different than above, please enter your first name below as it appears on your ID.',
    'Last name on ID (if different from above)',
  ])('does not classify %s as a person name', (label) => {
    const cls = classifyField(makeMeta({ label, htmlId: '1707189136855001yJOs' }));
    expect(cls === null || cls.confidence < 0.6).toBe(true);
  });

  it('still classifies the primary badge name', () => {
    const cls = classifyField(makeMeta({ label: 'First name (this will print on your badge)', htmlId: 'formAttendee-firstname' }));
    expect(cls?.category).toBe('firstName');
  });
});
