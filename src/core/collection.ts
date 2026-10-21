// Single source of the collection cap (PBI-117): profiles and addresses share
// one limit, and the options UI and the transfer import path both read it here
// so the two checks cannot drift. Only the notice wording differs per
// collection.
export const MAX_ITEMS = 10;
export const isAtLimit = (count: number): boolean => count >= MAX_ITEMS;
