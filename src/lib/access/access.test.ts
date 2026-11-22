import { describe, expect, it } from 'vitest';
import { NAVIGATION, visibleNavigation } from '@/lib/navigation';
import { canOpen, ROUTE_PERMISSIONS, ruleFor } from './routeGuard';
import { branchesFor, canAnywhere, canAt, canTenantWide, fleetBranchScope, hasAnyFleetPermission, type FleetAccess } from './fleetAccess';

const LCB = '11111111-1111-1111-1111-111111111111';
const BKK = '22222222-2222-2222-2222-222222222222';

const owner: FleetAccess = {
  permissions: [
    { permission: 'fleet.workorder.view', allBranches: true, branchIds: [] },
    { permission: 'fleet.setup.manage', allBranches: true, branchIds: [] },
    { permission: 'fleet.asset.manage', allBranches: true, branchIds: [] },
  ],
};

const opsLcb: FleetAccess = {
  permissions: [
    { permission: 'fleet.workorder.view', allBranches: false, branchIds: [LCB] },
    { permission: 'fleet.stock.issue', allBranches: false, branchIds: [LCB, BKK] },
    { permission: 'fleet.setup.manage', allBranches: false, branchIds: [] }, // = not held
  ],
};

const gateClerk: FleetAccess = {
  permissions: [{ permission: 'fleet.workorder.view', allBranches: false, branchIds: [] }],
};

describe('fleet access helpers', () => {
  it('canAnywhere: tenant-wide or at least one branch', () => {
    expect(canAnywhere(owner, 'fleet.setup.manage')).toBe(true);
    expect(canAnywhere(opsLcb, 'fleet.workorder.view')).toBe(true);
    expect(canAnywhere(opsLcb, 'fleet.setup.manage')).toBe(false);
    expect(canAnywhere(opsLcb, 'fleet.tyre.view')).toBe(false);
    expect(canAnywhere(undefined, 'fleet.workorder.view')).toBe(false);
  });

  it('canAt: only at the granted branch, any branch when tenant-wide', () => {
    expect(canAt(opsLcb, 'fleet.workorder.view', LCB)).toBe(true);
    expect(canAt(opsLcb, 'fleet.workorder.view', BKK)).toBe(false);
    expect(canAt(opsLcb, 'fleet.workorder.view', null)).toBe(false);
    expect(canAt(owner, 'fleet.workorder.view', BKK)).toBe(true);
  });

  it('canTenantWide', () => {
    expect(canTenantWide(owner, 'fleet.asset.manage')).toBe(true);
    expect(canTenantWide(opsLcb, 'fleet.stock.issue')).toBe(false);
  });

  it('branchesFor', () => {
    expect(branchesFor(owner, 'fleet.workorder.view')).toEqual({ all: true });
    expect(branchesFor(opsLcb, 'fleet.stock.issue')).toEqual({ all: false, branchIds: [LCB, BKK] });
    expect(branchesFor(opsLcb, 'fleet.tyre.view')).toEqual({ all: false, branchIds: [] });
  });

  it('hasAnyFleetPermission / fleetBranchScope', () => {
    expect(hasAnyFleetPermission(owner)).toBe(true);
    expect(hasAnyFleetPermission(gateClerk)).toBe(false);
    expect(fleetBranchScope(owner)).toEqual({ all: true });
    expect(fleetBranchScope(opsLcb)).toEqual({ all: false, branchIds: [LCB, BKK] });
    expect(fleetBranchScope(gateClerk)).toEqual({ all: false, branchIds: [] });
  });
});

describe('route guard map', () => {
  const allHrefs = NAVIGATION.flatMap((n) => [n.href, ...(n.items ?? []).map((i) => i.href)]).filter(Boolean) as string[];

  it('covers every sidebar link', () => {
    const missing = allHrefs.filter((href) => ruleFor(href) === null);
    expect(missing).toEqual([]);
  });

  it('uses only known permission codes', () => {
    const codes = new Set(Object.values(ROUTE_PERMISSIONS).flat());
    for (const code of codes) expect(code).toMatch(/^(fleet|revenue)\.[a-z]+\.[a-z]+$/);
  });

  it('longest prefix wins, detail pages inherit the list rule', () => {
    expect(ruleFor('/fleet/work-orders/monitoring')).toEqual(['fleet.workorder.view']);
    expect(ruleFor('/fleet/fuel-logs/approval')).toEqual(['fleet.fuel.approve']);
    expect(ruleFor('/fleet/fuel-logs/123')).toEqual(['fleet.fuel.view']);
    expect(ruleFor('/master/equipment/abc?tab=spec')).toEqual(['fleet.asset.view']);
    expect(ruleFor('/master/equipment-types/7')).toEqual(['fleet.asset.view']);
  });

  it('does not match on a partial segment', () => {
    // '/master/equipment-types' must not be treated as '/master/equipment' + junk, and vice versa
    expect(ruleFor('/master/equipmentX')).toBeNull();
  });

  it('closes routes with no rule', () => {
    expect(canOpen('/secret', () => true, true)).toBe(false);
  });

  it('[] rule = any fleet user', () => {
    expect(canOpen('/dashboard', () => false, true)).toBe(true);
    expect(canOpen('/dashboard', () => false, false)).toBe(false);
  });

  it('opens a page when ANY listed permission is held', () => {
    const can = (p: string) => p === 'fleet.workrequest.create';
    expect(canOpen('/fleet/work-requests/new', can, true)).toBe(true);
    expect(canOpen('/fleet/work-orders', can, true)).toBe(false);
  });

  it('sidebar: owner sees everything fleet, gate clerk sees nothing, empty groups drop', () => {
    const everything = visibleNavigation(NAVIGATION, (p) => p.startsWith('fleet.'), true);
    expect(everything.find((g) => g.titleKey === 'nav.tariff')).toBeUndefined(); // revenue.* not held
    expect(everything.find((g) => g.titleKey === 'nav.master')?.items?.length).toBe(
      NAVIGATION.find((g) => g.titleKey === 'nav.master')?.items?.length,
    );

    expect(visibleNavigation(NAVIGATION, () => false, false)).toEqual([]);

    const tyresOnly = visibleNavigation(NAVIGATION, (p) => p === 'fleet.tyre.view', true);
    expect(tyresOnly.map((g) => g.titleKey)).toEqual(['nav.dashboard', 'nav.master', 'nav.tireManagement', 'nav.inquiry']);
    expect(tyresOnly.find((g) => g.titleKey === 'nav.master')?.items?.map((i) => i.href)).toEqual(['/master/fleet-setup']);
  });
});
