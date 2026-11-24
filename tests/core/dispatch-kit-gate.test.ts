import { describe, it, expect } from 'vitest';
import type { DispatchCtx } from '../../src/core/dispatch-kit';
import { ownLegend } from '../../src/core/dispatch-kit';
import { makeMeta } from '../helpers';

// Pins the ownLegend gate contract: legendGate defaults to extra, so the
// own-side gate also guards the legend side unless legendExtra overrides it.
const ctx = (over: Partial<DispatchCtx> = {}): DispatchCtx => ({
  m: makeMeta(),
  ownText: '',
  legendText: '',
  overseasCtx: '',
  isOptionField: false,
  ...over,
});

describe('ownLegend legend gate default', () => {
  it('applies extra to the legend side when legendExtra is absent', () => {
    const [own, legend] = ownLegend(/性別/, 'gender', (c) => c.isOptionField);
    const gated = ctx({ ownText: '性別', legendText: '性別', isOptionField: false });
    expect(own.match(gated)).toBeNull();
    expect(legend.match(gated)).toBeNull();
    const open = ctx({ ownText: '性別', legendText: '性別', isOptionField: true });
    expect(own.match(open)?.category).toBe('gender');
    expect(legend.match(open)?.category).toBe('gender');
  });

  it('lets legendExtra override the own-side gate', () => {
    const [own, legend] = ownLegend(
      /性別/,
      'gender',
      () => false,
      () => true,
    );
    const target = ctx({ ownText: '性別', legendText: '性別' });
    expect(own.match(target)).toBeNull();
    expect(legend.match(target)?.category).toBe('gender');
  });

  it('leaves both sides free when no gate is given', () => {
    const [own, legend] = ownLegend(/性別/, 'gender');
    const target = ctx({ ownText: '性別', legendText: '性別' });
    expect(own.match(target)?.category).toBe('gender');
    expect(legend.match(target)?.category).toBe('gender');
  });
});
