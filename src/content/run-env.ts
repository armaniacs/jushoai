import { applyMapping, hostOf, type MappingEntry } from '../core/domain-mapping';
import { recordFor, type ApprovalRecord } from '../core/site-approval';
import type { CarryEntry } from '../core/carryover';
import type { GuestValues } from '../core/guest';
import type { Address, FieldMeta, Profile, RunContext } from '../core/types';
import type { FieldClassifier } from '../core/classifier';
import { classifyWithReason, type SessionPanel } from '../content-session';
import { applyIfConsented, defaultConsentCheckDeps } from './consent-check';
import { fillField } from '../dom/fill';
import { fillPlan, targetsFromControls } from '../dom/fill-plan';
import type { PlanItem } from '../core/planner';
import type { Control } from '../dom/scan-fields';
import { persistWrite } from './persist-write';
import { saveLastUsed } from '../storage';
import { upsertApproval } from '../approval-store';
import { upsertAssignment } from '../assignment-store';
import type { FillBundle } from './fill-flow';

// PBI-221: run() 内で毎回組み立てていた FillBundle (input + env クロージャ群)
// の純粋な組み立て。組み立て時に DOM・chrome・tabMemory を読まない: 呼び出し
// 元 (content.ts の run()) が解決済みの値を deps に渡し、副作用は返した
// クロージャの呼び出し時にだけ走る。既定の副作用口は元の run() と同一の実
// モジュールで、テストだけが fake を注入する。
export interface RunEnvDeps {
  // session 由来: FillBundle input の解決済み値。guest 上書き・割当先頭・
  // carryover snapshot の解決は run() 側に残し、ここでは field pass する。
  profiles: Profile[];
  addresses: Address[];
  lastProfileId?: string;
  lastAddressId?: string;
  // PBI-141: この host の割当 (無い・消滅時は null)。候補提示のみ。
  assignedProfileId: string | null;
  // PBI-201: bundle 構築時の carryover snapshot。owner が replace するため
  // この値は build 時のまま変わらない。
  carryover: Record<string, string> | undefined;
  metas: FieldMeta[];
  metasById: Map<string, FieldMeta>;
  englishPage: boolean;
  canReanalyze: boolean;
  // PBI-181: run の共有 pass。env.classify が first-class で受け渡す。
  run: RunContext;
  // tabMemory・run 由来: env クロージャが閉じる値。
  host: string;
  activeMappings: MappingEntry[];
  effectiveClassifier: FieldClassifier | null;
  llmSkip?: ReadonlySet<string>;
  // PBI-144: run が snapshot した guest。apply が消費するのはこの snapshot。
  activeGuest: GuestValues | null;
  controlsById: Map<string, { el: Control; radioInputs?: HTMLInputElement[] }>;
  pageHref: string;
  provider: string;
  version: string;
  // FillFlow が apply 後に読む選択 (session.selectedProfileId/AddressId)。
  // session は bundle の後に作られるため late-bound getter で受け取る。
  getSelection: () => { profileId: string; addressId: string };
  // 副作用口。既定は元の run() と同一 (未指定 = 実モジュール)。
  fillField?: (el: Control, value: string) => void;
  isExcluded: () => boolean;
  openUrl?: (url: string) => void;
  persist?: (what: string, write: () => Promise<void>) => void;
  saveLastUsed?: (sel: { profileId: string; addressId: string }) => Promise<void>;
  upsertApproval?: (record: ApprovalRecord) => Promise<void>;
  upsertAssignment?: (host: string, profileId: string) => Promise<void>;
  mergeCarryover?: (entries: readonly CarryEntry[]) => void;
  consumeGuest?: (snapshot: GuestValues | null) => void;
  // テスト用 seam。既定は元の run() と同一の同意語彙。
  checkConsent?: (panel: SessionPanel) => { ok: true } | { ok: false; reason: string };
}

export function buildRunEnv(deps: RunEnvDeps): FillBundle {
  const fillOneField = deps.fillField ?? fillField;
  const persist = deps.persist ?? persistWrite;
  const doSaveLastUsed = deps.saveLastUsed ?? saveLastUsed;
  const doUpsertApproval = deps.upsertApproval ?? upsertApproval;
  const doUpsertAssignment = deps.upsertAssignment ?? upsertAssignment;
  const openFeedbackUrl = deps.openUrl ?? ((url: string) => { window.open(url, '_blank', 'noopener'); });
  const checkConsent = deps.checkConsent ?? ((p: SessionPanel) => {
    let verdict: { ok: true } | { ok: false; reason: string } = { ok: false, reason: '' };
    // applyIfConsented reports through callbacks; the no-op apply keeps the
    // check side-effect free while reusing the single consent vocabulary.
    applyIfConsented(
      defaultConsentCheckDeps(() => p.getApplyPoint(), undefined, () => p.getHost()),
      () => { verdict = { ok: true }; },
      (reason) => { verdict = { ok: false, reason }; },
    );
    return verdict;
  });

  // PBI-55: the same context feeds the apply-time feedback and the
  // post-apply breakdown report, so the report URL cannot drift from it.
  const feedbackCtx = () => ({
    pageHref: deps.pageHref,
    provider: deps.provider,
    version: deps.version,
  });

  return {
    input: {
      profiles: deps.profiles,
      addresses: deps.addresses,
      lastProfileId: deps.lastProfileId,
      lastAddressId: deps.lastAddressId,
      assignedProfileId: deps.assignedProfileId,
      // PBI-201: the carryover read at bundle-build time. The owner
      // replaces (never mutates) the map on merge, so this stays the
      // run's build-time snapshot while the fill-one getter sees the
      // latest.
      carryover: deps.carryover,
      metas: deps.metas,
      metasById: deps.metasById,
      englishPage: deps.englishPage,
      canReanalyze: deps.canReanalyze,
      // PBI-181: the run's shared pass. The session attaches it to every
      // classify call, so the env below passes it through first-class.
      run: deps.run,
    },
    env: {
      // PBI-138: the taught mapping rides as a correction layer on top of
      // whatever classification path ran — the learned pair wins over the
      // rule, and an excluded page never gets here (the session returns
      // excluded before opening any panel).
      classify: (ms, opts) =>
        classifyWithReason(deps.effectiveClassifier, ms, {
          ...opts,
          llmSkip: deps.llmSkip,
          // PBI-181: pass through the shared bundle received first-class on
          // opts.run (attached from input.run by the session). No
          // metas-identity check: a copied/filtered metas array resolves to
          // the same pass.
          premade: opts.run,
        }).then((res) => ({
          ...res,
          items: applyMapping(res.items, deps.activeMappings, deps.host),
        })),
      checkConsent,
      injectPlan: (plan: PlanItem[]) => {
        const report = fillPlan(plan, targetsFromControls(deps.controlsById, fillOneField));
        // Developer record (PBI-82/94): countable breakdown by reason.
        // Display decisions stay with onApply so the partial banner cannot
        // clobber the AI failure hint; the happy path stays silent.
        console.debug('[JushoAI] fill outcomes', report.summary);
        return report;
      },
      // PBI-153: a failed write is reported instead of becoming an
      // unhandled rejection; the typed error keeps it identifiable.
      persistSelection: (sel) => { persist('最終使用状態', () => doSaveLastUsed(sel)); },
      openUrl: openFeedbackUrl,
      feedbackContext: feedbackCtx,
      isExcluded: deps.isExcluded,
      // PBI-142: the filled values merge into this tab's carryover, so the
      // next page re-offers them. Tab-scoped memory only — never storage.
      recordCarryover: (entries) => {
        deps.mergeCarryover?.(entries);
      },
      // PBI-128: the per-site approval memory. A record for this host with
      // the same form shape and selection shortens the preview to the
      // changed rows; a clean apply records the shape (digests only — no
      // raw profile value, no raw label).
      recordApproval: (rows) => {
        // PBI-153: reported through persistWrite instead of an unhandled
        // rejection inside the `void` IIFE.
        persist('サイトごとの承認', async () => {
          const sel = deps.getSelection();
          const record = recordFor(deps.pageHref, deps.metas, rows, sel.profileId, sel.addressId);
          if (!record.domain) return;
          await doUpsertApproval(record);
        });
      },
      // PBI-141: the profile used on this host is learned from use. Only the
      // host → profileId pair persists — never a profile value.
      recordAssignment: (profileId) => {
        // PBI-153: reported through persistWrite instead of an unhandled
        // rejection from the bare `void`.
        persist('サイトごとの割当て', () => doUpsertAssignment(deps.host, profileId));
      },
      // PBI-144: the guest is one-shot — the fill consumes it. Without this
      // the run would keep overlaying the stored data for every later
      // press on the same tab (BDD: タブを閉じるか完了する→破棄).
      onApplied: () => {
        // Only the run that snapshotted a guest consumes it: a non-guest
        // run's apply never clears a guest set after its snapshot.
        deps.consumeGuest?.(deps.activeGuest);
      },
    },
  };
}
