// Import draft (PBI-127): a partial profile/address draft read from the
// page's FILLED fields. Chrome's own autofill data is not readable by an
// extension, so the realistic path is the form the user already has open with
// autofilled values: the content script classifies (rule-only, no LLM, no
// gate) and this pure module maps the confident filled fields onto the
// profile/address keys. Empty fields never contribute; unknown classifications
// never contribute.

import type { Address, Item, Profile } from './types';

export interface ImportDraft {
  profile: Partial<Record<keyof Profile, string>>;
  address: Partial<Record<keyof Address, string>>;
}

// Classification → profile key. Only the fields a new user's first form
// realistically carries; anything else stays out of the draft.
const PROFILE_KEYS: Partial<Record<Item['cls']['category'], keyof Profile>> = {
  lastName: 'lastName',
  firstName: 'firstName',
  lastNameKana: 'lastNameKana',
  firstNameKana: 'firstNameKana',
  lastNameRomaji: 'lastNameRomaji',
  firstNameRomaji: 'firstNameRomaji',
  email: 'email',
  tel: 'tel',
  birthday: 'birthday',
  school: 'school',
  company: 'companyName',
  department: 'companyDepartment',
};

const ADDRESS_KEYS: Partial<Record<Item['cls']['category'], keyof Address>> = {
  zip: 'zip',
  prefecture: 'prefecture',
  city: 'city',
  street: 'street',
  building: 'building',
};

export function draftFromPage(items: Item[]): ImportDraft {
  const draft: ImportDraft = { profile: {}, address: {} };
  let zip1 = '';
  let zip2 = '';
  for (const { meta, cls } of items) {
    const value = meta.value.trim();
    // An unfilled or blocked control contributes nothing: the draft reflects
    // what the page already holds, never what JushoAI would fill.
    if (!value || meta.readOnly || meta.disabled || cls.category === 'unknown') continue;
    // A split zip half is collected before the address-key lookup: the halves
    // are not address values on their own and reassemble below.
    if (cls.category === 'zip1' && !zip1) {
      zip1 = value;
      continue;
    }
    if (cls.category === 'zip2' && !zip2) {
      zip2 = value;
      continue;
    }
    const profileKey = PROFILE_KEYS[cls.category];
    if (profileKey && !draft.profile[profileKey]) {
      draft.profile[profileKey] = value;
      continue;
    }
    const addressKey = ADDRESS_KEYS[cls.category];
    if (addressKey && !draft.address[addressKey]) {
      draft.address[addressKey] = value;
    }
  }
  // A split zip reassembles only when both halves were read; a lone half is
  // not a zip and never becomes one silently.
  if (zip1 && zip2) draft.address.zip = `${zip1}${zip2}`;
  return draft;
}
