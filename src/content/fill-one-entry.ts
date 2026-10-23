import { planOneField } from '../core/fill-one';
import type { FillOneReason } from '../core/fill-one';
import { resolveAddressId, resolveLastId } from '../core/selection';
import { hostOf } from '../core/domain-mapping';
import type { Address, FieldMeta, Profile } from '../core/types';
import type { MappingEntry } from '../core/domain-mapping';

// One-field entry extracted from the content script (PBI-137): every entry
// (right-click, Alt+J) rides through here, so the exclusion gate is checked in
// one place. An excluded URL keeps its opt-out for every entry, not just the
// in-page button — the guards on the analyze/import/guest message handlers
// each check the same gate.

export interface ScannedTarget {
  el: Control;
  meta: FieldMeta;
}

// The minimal control shape the fill needs; the scan supplies the real one.
export type Control = HTMLInputElement | HTMLSelectElement;

export interface FillOneEntryDeps {
  // The exclusion gate. Checked first: an excluded page fills nothing.
  isExcluded(): boolean;
  // The scan for the target: returns the control whose element (or radio
  // input) is the target, or null when the target is not fillable.
  scan(target: Element | null): ScannedTarget | null;
  // The stored data, the last-used selection, and the taught correction layer.
  load(): Promise<{ data: { profiles: Profile[]; addresses: Address[] }; last: { profileId?: string | null; addressId?: string }; mappings: MappingEntry[] }>;
  // The stored-data readiness check (profiles valid and at least one address).
  ready(data: { profiles: Profile[]; addresses: Address[] }): boolean;
  // The tab-scoped carryover from the earlier pages of this tab.
  carryover(): Record<string, string>;
  domain(): string;
  // No usable data: the settings page opens instead of any fill.
  onNoData(): void;
  // The blocked-notice panel for a non-fillable reason.
  showBlocked(label: string, reason: FillOneReason | string): Promise<void>;
  // The confirmation panel. Returns the mode: 'fill' injects.
  confirm(label: string, display: string): Promise<{ mode: string }>;
  fill(el: Control, value: string): void;
}

export async function fillOneEntry(target: Element | null, deps: FillOneEntryDeps): Promise<void> {
  if (!target) return;
  if (deps.isExcluded()) return;
  const scanned = deps.scan(target);
  if (!scanned) return;
  const { data, last, mappings } = await deps.load();
  if (!deps.ready(data)) {
    deps.onNoData();
    return;
  }
  const profileId = resolveLastId(last.profileId ?? undefined, data.profiles.map((p) => p.id))
    ?? data.profiles[0]!.id;
  const profile = data.profiles.find((p) => p.id === profileId) ?? data.profiles[0]!;
  const addressId = resolveAddressId(data.addresses, profileId, last.addressId);
  const address = data.addresses.find((a) => a.id === addressId) ?? null;
  const resolved = planOneField(scanned.meta, profile, address, new Date(), {
    mappings: { entries: mappings, domain: deps.domain() },
    carryover: deps.carryover(),
  });
  const label = scanned.meta.label || scanned.meta.name || scanned.meta.htmlId || scanned.meta.id;
  if (!resolved.ok) {
    await deps.showBlocked(label, resolved.reason);
    return;
  }
  const decision = await deps.confirm(`${label}（${scanned.meta.type}）`, resolved.plan.display);
  if (decision.mode !== 'fill') return;
  deps.fill(scanned.el, resolved.plan.value);
}
