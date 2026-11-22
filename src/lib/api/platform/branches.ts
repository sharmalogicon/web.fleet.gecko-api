'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, query, setRequestBranch } from '@/lib/api/client';
import type { components } from '@/lib/api/platform.schema';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useFleetAccess } from '@/lib/api/fleet/access';
import { fleetBranchScope } from '@/lib/access/fleetAccess';
import { useBranchStore } from '@/lib/stores/useBranchStore';

export type Branch = components['schemas']['BranchResponse'];
type BranchPage = components['schemas']['PagedResultOfBranchResponse'];

/** GET /api/branches (Platform API): the tenant's branches, one page of up to 200. */
export const getBranches = () =>
  apiGet<BranchPage>(`/api/branches${query({ Page: 1, PageSize: 200 })}`).then((p) => p.items);

/** Active branches the user can act at for Fleet (from /api/fleet/access), sorted by code. */
export function pickFleetBranches(all: Branch[], scope: ReturnType<typeof fleetBranchScope>): Branch[] {
  const allowed = scope.all ? all : all.filter((b) => scope.branchIds.includes(b.branchId));
  return allowed.filter((b) => b.isActive).sort((a, b) => a.branchCode.localeCompare(b.branchCode));
}

/**
 * The branch switcher's data: the user's Fleet branches and the current one
 * (remembered per user; defaults to the first branch).
 */
export function useBranchContext() {
  const { user, isAuthenticated } = useAuth();
  const { access, isSuccess: accessReady } = useFleetAccess();
  const branchesQuery = useQuery({
    queryKey: ['platform', 'branches', user?.tenantId],
    queryFn: getBranches,
    enabled: isAuthenticated && accessReady,
    staleTime: 10 * 60_000,
  });

  const branches = useMemo(
    () => pickFleetBranches(branchesQuery.data ?? [], fleetBranchScope(access)),
    [branchesQuery.data, access],
  );

  const userId = user?.userId;
  const stored = useBranchStore((s) => (userId ? s.byUser[userId] : undefined));
  const setBranch = useBranchStore((s) => s.setBranch);

  const current = branches.find((b) => b.branchId === stored) ?? branches[0] ?? null;

  // Every API call carries the current branch (X-Branch-Id); cleared when there is none (signed out / no branches).
  const currentId = current?.branchId ?? null;
  useEffect(() => {
    setRequestBranch(currentId);
  }, [currentId]);

  // Remember the default (or replace a branch the user lost access to).
  useEffect(() => {
    if (userId && current && current.branchId !== stored) setBranch(userId, current.branchId);
  }, [userId, current, stored, setBranch]);

  return {
    branches,
    current,
    currentBranchId: current?.branchId ?? null,
    setCurrent: (branchId: string) => userId && setBranch(userId, branchId),
    isLoading: branchesQuery.isLoading,
    error: branchesQuery.error,
  };
}
