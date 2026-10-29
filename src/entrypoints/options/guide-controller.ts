// Single owner of floating-guide visibility (PBI-170): tab clicks,
// hashchange, and render all sync through GuideController.sync(), which
// reads the dismissed flag and the active page itself and decides
// show/hide from the pure guideState() predicate.
import { normalizeAddress, normalizeProfile } from '../../core/profile';
import type { StoredData } from '../../core/types';
import { actionButton, el } from './dom';
import {
  dismissGuideForSession, hideGuide, isGuideDismissed, showGuide,
} from './notice-center';
import {
  ADDRESSES_SECTION_ID, PROFILES_SECTION_ID, getActivePage, setActivePage,
} from './nav';
import { guideState, type TrialMode } from './save-guide';

export interface GuideActions {
  onTrialBoth: () => void;
  onTrialProfile: () => void;
  onTrialAddress: () => void;
}

export interface GuideController {
  sync(): void;
}

export function createGuideController(
  getState: () => StoredData,
  actions: GuideActions,
): GuideController {
  function trialButtonFor(mode: 'both' | 'profile' | 'address'): HTMLButtonElement {
    if (mode === 'profile') {
      return actionButton('架空の名前を作って試す', false, actions.onTrialProfile);
    }
    if (mode === 'address') {
      return actionButton('架空の住所を作って試す', false, actions.onTrialAddress);
    }
    return actionButton('架空の名前と住所を作って試す', false, actions.onTrialBoth);
  }

  function buildGuideNode(mode: TrialMode): HTMLElement {
    const wrap = el('div');
    const head = el('p');
    head.textContent = '初めてですか？架空の名前と住所で試せます';
    const trial = trialButtonFor(mode === 'none' ? 'both' : mode);
    const toProfiles = actionButton('名前を登録する', false, () => setActivePage(PROFILES_SECTION_ID));
    const toAddresses = actionButton('住所を登録する', false, () => setActivePage(ADDRESSES_SECTION_ID));
    const x = actionButton('×', false, () => dismissGuideForSession());
    x.classList.add('float-close');
    const row = el('div');
    row.className = 'float-row';
    row.append(trial, toProfiles, toAddresses, x);
    wrap.append(head, row);
    return wrap;
  }

  function sync(): void {
    const state = getState();
    const resolved = guideState(
      state.profiles.map(normalizeProfile),
      state.addresses.map(normalizeAddress),
      getActivePage(),
      isGuideDismissed(),
    );
    if (resolved.visible) {
      showGuide(buildGuideNode(resolved.mode));
    } else {
      hideGuide();
    }
  }

  return { sync };
}
