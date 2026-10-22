import { describe, it, expect } from 'vitest';
import {
  changedRows, digest, formSignature, matches, recordFor,
} from '../../src/core/site-approval';
import { makeMeta } from '../helpers';

const metas = [makeMeta({ id: 'f1', name: 'zip' }), makeMeta({ id: 'f2', name: 'tel' })];
const rows = [
  { fieldId: 'f1', status: 'ok', display: '100-0001' },
  { fieldId: 'f2', status: 'ok', display: '03-0000-0000' },
];

describe('digest (PBI-128)', () => {
  it('is stable and separates different inputs', () => {
    expect(digest('a|ok|x')).toBe(digest('a|ok|x'));
    expect(digest('a|ok|x')).not.toBe(digest('a|ok|y'));
  });
});

describe('formSignature (PBI-128)', () => {
  it('changes with the field set', () => {
    expect(formSignature(metas)).toBe(formSignature(metas));
    expect(formSignature(metas)).not.toBe(formSignature([metas[0]!]));
  });
});

describe('matches (PBI-128)', () => {
  it('matches the same site, form and selection', () => {
    const record = recordFor('https://e.com/form', metas, rows, 'p1', 'a1');
    expect(matches(record, 'https://e.com/form', metas, 'p1', 'a1')).toBe(true);
    expect(matches(record, 'https://other.com/form', metas, 'p1', 'a1')).toBe(false);
    expect(matches(record, 'https://e.com/form', [metas[0]!], 'p1', 'a1')).toBe(false);
    expect(matches(record, 'https://e.com/form', metas, 'p2', 'a1')).toBe(false);
    expect(matches(record, 'https://e.com/form', metas, 'p1', 'a2')).toBe(false);
    expect(matches(null, 'https://e.com/form', metas, 'p1', 'a1')).toBe(false);
  });
});

describe('changedRows (PBI-128)', () => {
  it('keeps only the rows that differ from the record', () => {
    const record = recordFor('https://e.com/form', metas, rows, 'p1', 'a1');
    expect(changedRows(rows, record)).toEqual([]);

    const changed = [rows[0]!, { fieldId: 'f2', status: 'ok', display: 'different' }];
    const out = changedRows(changed, record);
    expect(out).toEqual([changed[1]]);

    // A new field has no stored digest and stays.
    const added = [...rows, { fieldId: 'f3', status: 'ok', display: 'x' }];
    expect(changedRows(added, record)).toEqual([{ fieldId: 'f3', status: 'ok', display: 'x' }]);
  });

  it('keeps a row without a field id (a synthetic line)', () => {
    const record = recordFor('https://e.com/form', metas, rows, 'p1', 'a1');
    const synthetic = { status: 'ok', display: 'note' };
    expect(changedRows([synthetic], record)).toEqual([synthetic]);
  });
});
