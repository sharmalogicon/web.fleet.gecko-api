'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api/client';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  branchesFor,
  canAnywhere,
  canAt,
  canTenantWide,
  hasAnyFleetPermission,
  type FleetAccess,
} from '@/lib/access/fleetAccess';

/** GET /api/fleet/access: the user's fleet permissions per branch. */
export const getFleetAccess = () => apiGet<FleetAccess>('/api/fleet/access');

/**
 * Loaded once after login (per user; a branch switch does not change it).
 * Permission codes that are not `fleet.*` (e.g. `revenue.tariff.view`) are answered from
 * the Platform token instead.
 */
export function useFleetAccess() {
  const { user, isAuthenticated, hasFleetModule, can: canPlatform } = useAuth();
  const query = useQuery({
    queryKey: ['fleet', 'access', user?.userId],
    queryFn: getFleetAccess,
    enabled: isAuthenticated && hasFleetModule,
    staleTime: 5 * 60_000,
  });
  const access = query.data;

  const anywhere = useCallback(
    (permission: string) => (permission.startsWith('fleet.') ? canAnywhere(access, permission) : canPlatform(permission)),
    [access, canPlatform],
  );

  return useMemo(() => ({
    ...query,
    access,
    canAnywhere: anywhere,
    canAt: (permission: string, branchId: string | null | undefined) => canAt(access, permission, branchId),
    canTenantWide: (permission: string) => canTenantWide(access, permission),
    branchesFor: (permission: string) => branchesFor(access, permission),
    isFleetUser: hasAnyFleetPermission(access),
  }), [query, access, anywhere]);
}
