// Profile auto-switch (PBI-141): the pure layer for the per-site profile
// assignment. The assignment is a host → profileId pair learned from use; the
// assigned profile becomes the preview's first candidate and the initial
// selection. 切替は候補提示のみ — nothing auto-injects, and the user can
// still switch in the preview.

import type { Profile } from './types';
import { hostOf } from './domain-mapping';

// The assigned profile first (when it still exists), the rest in stored order.
export function assignedFirst(profiles: Profile[], assignedId: string | null): Profile[] {
  if (!assignedId) return profiles;
  const assigned = profiles.find((p) => p.id === assignedId);
  if (!assigned) return profiles;
  return [assigned, ...profiles.filter((p) => p.id !== assignedId)];
}

// The assignment for this page's host, or null when the host is unknown or the
// stored profileId is gone.
export function assignmentFor(
  href: string,
  assignments: Record<string, string>,
  profileIds: readonly string[],
): string | null {
  const profileId = assignments[hostOf(href)];
  if (!profileId) return null;
  return profileIds.includes(profileId) ? profileId : null;
}
