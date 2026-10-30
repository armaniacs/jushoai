// Boot skeleton shared by the list sections (exclusion, mapping): load first,
// render once it resolves, and a failed load renders the empty skeleton plus
// the shared notice. The audit section's refresh (try/catch plus a notice) is
// the reference; without the catch a failed first read used to surface as an
// unhandled rejection and leave a blank page (PBI-195).
import { notice } from './dom';

// The「読み込めませんでした。」 family shared with the audit and transfer
// sections; the wording lives here so the list sections cannot drift.
const LOAD_FAILED = 'データを読み込めませんでした。';

// The section keeps its load/save deps and its rendering; this helper owns the
// boot order (load, then render) and the failure notice. onFailed receives the
// notice element so each section decides where it renders.
export function bootListSection<T>(
  load: () => Promise<T>,
  onLoaded: (entries: T) => void,
  onFailed: (failure: HTMLElement) => void,
): void {
  void load().then(onLoaded, () => onFailed(notice('errors', [LOAD_FAILED])));
}
