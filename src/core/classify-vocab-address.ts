import { matchAs, ownLegend } from './dispatch-kit';
import type { MatcherEntry } from './dispatch-kit';
import type { Category } from './types';

export const COUNTRY = /country/i;
export const ADDR_LINE = /address[_-]?([1-4])/i;
export const POSTAL_CODE = /postal[-_ ]?code/i;
export const OVERSEAS_CTX = /country|postal|city|state|province|region|street|building|apartment/i;
export const FOREIGN_MARK = /半角英数|海外|foreign|english|alphabet/i;

// Entry order inside this array is match priority; the DISPATCH composition in
// classify-rules.ts owns the overall order.
export const addressEntries: readonly MatcherEntry[] = [
  // Overseas address fields are named explicitly (country, address_1..4,
  // postal_code), so they classify without sibling refinement. 国名 alone
  // stays unclassified: on domestic forms it is ambiguous with person names.
  // Bare address1/address2 keep their domestic readings (addressFull/building):
  // the overseas reading needs an overseas context (city/state/street words
  // or a half-width note) in the field or its heading.
  ...ownLegend(COUNTRY, 'country'),
  {
    name: 'address-line-own',
    match: (ctx) => {
      const addrLine = ctx.ownText.match(ADDR_LINE);
      return addrLine && OVERSEAS_CTX.test(ctx.overseasCtx)
        ? matchAs(`address${addrLine[1]}` as Category, 0.7)
        : null;
    },
  },
  {
    name: 'address-line-legend',
    match: (ctx) => {
      const addrLegend = ctx.legendText.match(ADDR_LINE);
      return addrLegend && OVERSEAS_CTX.test(ctx.overseasCtx)
        ? matchAs(`address${addrLegend[1]}` as Category, 0.65)
        : null;
    },
  },
  // postal-code: half-width/foreign note gates both sides; the legend side
  // reads the combined field+heading context.
  ...ownLegend(
    POSTAL_CODE,
    'postalCode',
    (ctx) => FOREIGN_MARK.test(ctx.ownText),
    (ctx) => FOREIGN_MARK.test(ctx.overseasCtx),
  ),
];
