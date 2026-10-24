import { describe, it, expect } from 'vitest';
import { egressRowsFor, egressRowSummary } from '../../src/ai/egress-preview';
import { makeMeta } from '../helpers';

describe('egressRowsFor', () => {
  it('builds rows from the wire allow-list only', () => {
    const rows = egressRowsFor([
      makeMeta({ id: 'a', name: 'last_name', label: '姓', type: 'text', maxLength: 20 }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('a');
    expect(rows[0]!.summary).toBe('name=last_name・label=姓・type=text・maxLength=20');
  });

  it('never carries the field value or select options', () => {
    const rows = egressRowsFor([
      makeMeta({ id: 'a', name: 'secret', label: '姓', value: '山田' , options: [{ value: 'x', text: '東京' }] }),
    ]);
    expect(rows[0]!.summary).not.toContain('山田');
    expect(rows[0]!.summary).not.toContain('東京');
  });

  it('marks name-like labels as suspects', () => {
    const rows = egressRowsFor([
      makeMeta({ id: 'a', label: '山田 太郎様' }),
      makeMeta({ id: 'b', label: '郵便番号' }),
    ]);
    expect(rows[0]!.suspect).toBe(true);
    expect(rows[1]!.suspect).toBe(false);
  });

  it('flags suspects found in placeholder or nearby too', () => {
    const rows = egressRowsFor([
      makeMeta({ id: 'a', label: '氏名', placeholder: '03-1234-5678' }),
      makeMeta({ id: 'b', label: '氏名', nearby: '〒100-0001' }),
    ]);
    expect(rows[0]!.suspect).toBe(true);
    expect(rows[1]!.suspect).toBe(true);
  });
});

describe('egressRowSummary', () => {
  it('lists only present fields', () => {
    expect(egressRowSummary({ id: 'x', type: 'email', name: 'mail', htmlId: '', label: '', placeholder: '', nearby: '', maxLength: null }))
      .toBe('name=mail・type=email');
  });
});
