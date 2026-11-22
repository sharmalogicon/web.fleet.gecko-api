import type { components } from '@/lib/api/fleet.schema';

/**
 * The user's Fleet permissions per branch, from GET /api/fleet/access.
 *
 * An entry with `allBranches: false` and no `branchIds` means "not held". These helpers
 * only decide what the UI shows (links, buttons); the Fleet API still decides every call.
 */
export type FleetAccess = components['schemas']['FleetAccessResponse'];
export type FleetAccessEntry = components['schemas']['FleetAccessEntry'];

function entryOf(access: FleetAccess | null | undefined, permission: string): FleetAccessEntry | undefined {
  return access?.permissions.find((e) => e.permission === permission);
}

/** Held tenant-wide, or at one branch at least. */
export function canAnywhere(access: FleetAccess | null | undefined, permission: string): boolean {
  const entry = entryOf(access, permission);
  return !!entry && (entry.allBranches || entry.branchIds.length > 0);
}

/** Held at this branch (tenant-wide counts). */
export function canAt(access: FleetAccess | null | undefined, permission: string, branchId: string | null | undefined): boolean {
  const entry = entryOf(access, permission);
  if (!entry) return false;
  if (entry.allBranches) return true;
  return !!branchId && entry.branchIds.includes(branchId);
}

/** Held tenant-wide (e.g. "Sync from Trucking" needs this). */
export function canTenantWide(access: FleetAccess | null | undefined, permission: string): boolean {
  return !!entryOf(access, permission)?.allBranches;
}

/** Where a permission is held: every branch, or a list (empty = nowhere). */
export type BranchScope = { all: true } | { all: false; branchIds: string[] };

export function branchesFor(access: FleetAccess | null | undefined, permission: string): BranchScope {
  const entry = entryOf(access, permission);
  if (entry?.allBranches) return { all: true };
  return { all: false, branchIds: entry ? [...entry.branchIds] : [] };
}

/** True when the user holds at least one fleet permission anywhere. */
export function hasAnyFleetPermission(access: FleetAccess | null | undefined): boolean {
  return !!access?.permissions.some((e) => e.allBranches || e.branchIds.length > 0);
}

/**
 * The branches the user can act at for Fleet: every branch when any fleet permission is
 * tenant-wide, else the union of the branch-limited grants.
 */
export function fleetBranchScope(access: FleetAccess | null | undefined): BranchScope {
  if (!access) return { all: false, branchIds: [] };
  if (access.permissions.some((e) => e.allBranches)) return { all: true };
  const ids = new Set<string>();
  for (const e of access.permissions) for (const id of e.branchIds) ids.add(id);
  return { all: false, branchIds: [...ids] };
}
