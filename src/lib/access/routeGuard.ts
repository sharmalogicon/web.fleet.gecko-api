/**
 * Which permission opens which page. UX only: it hides sidebar links and shows a 403
 * page for a typed URL. The APIs still check every call.
 *
 * - The longest matching prefix wins (`/fleet/work-orders/monitoring` before `/fleet/work-orders`).
 * - A rule lists permissions; holding ANY of them opens the page.
 * - `[]` = any signed-in Fleet user.
 * - A route with no rule is closed (403), so a new page cannot appear by accident:
 *   add it here when you add it to the app.
 * - `fleet.*` codes come from GET /api/fleet/access; anything else (e.g. `revenue.tariff.view`)
 *   from the Platform token (`/auth/me`).
 */
export const ROUTE_PERMISSIONS: Record<string, readonly string[]> = {
  '/dashboard': [],

  // Master data
  '/master/drivers': ['fleet.people.view'],
  '/master/technicians': ['fleet.people.view'],
  '/master/equipment': ['fleet.asset.view'],
  '/master/equipment-types': ['fleet.asset.view'],
  '/master/stock': ['fleet.inventory.view'],
  '/master/stores': ['fleet.inventory.view'],
  '/master/stock-labor-prices': ['fleet.inventory.view'],
  '/master/transporters': ['fleet.purchase.view'],
  // Settings are readable by every fleet user; number series need fleet.setup.manage (checked on the page).
  '/master/fleet-setup': [],

  // Work management
  '/fleet/work-requests': ['fleet.workrequest.create', 'fleet.workrequest.approve', 'fleet.workorder.view'],
  '/fleet/work-orders': ['fleet.workorder.view'],
  '/fleet/inspections': ['fleet.inspection.perform', 'fleet.inspection.manage'],
  '/fleet/inspections/checklists': ['fleet.inspection.perform', 'fleet.inspection.manage'],
  '/fleet/defects': ['fleet.inspection.manage'],
  '/fleet/work-orders/monitoring': ['fleet.workorder.view'],
  '/fleet/recharges': ['fleet.recharge.release', 'fleet.cost.view'],
  '/fleet/pm-scheduler': ['fleet.pm.view'],
  '/fleet/pm-due': ['fleet.pm.view'],
  '/fleet/service-types': ['fleet.pm.view'],

  // Fuel & meters
  '/fleet/fuel-logs': ['fleet.fuel.view'],
  '/fleet/fuel-logs/approval': ['fleet.fuel.approve'],
  '/fleet/meter-logs': ['fleet.asset.view', 'fleet.meter.record'],
  '/fleet/meter-hr-logs': ['fleet.asset.view', 'fleet.meter.record'],

  // Inventory
  '/fleet/goods-requests': ['fleet.inventory.view', 'fleet.stock.issue'],
  '/fleet/goods-requisitions': ['fleet.inventory.view', 'fleet.stock.issue'],
  '/fleet/purchase-orders': ['fleet.purchase.view'],
  '/fleet/goods-receipts': ['fleet.purchase.view', 'fleet.purchase.receive'],
  '/fleet/goods-adjustments': ['fleet.inventory.view', 'fleet.stock.adjust'],
  '/fleet/stock-counts': ['fleet.stock.adjust'],
  '/fleet/return-to-vendor': ['fleet.purchase.view'],
  '/fleet/spare-parts': ['fleet.inventory.view'],

  // Tyres
  '/fleet/tires': ['fleet.tyre.view'],

  // Incidents
  '/fleet/accidents': ['fleet.incident.view'],
  '/fleet/insurance-claims': ['fleet.incident.view'],
  '/fleet/traffic-violations': ['fleet.incident.view'],

  // Tariff (Revenue owns these tables)
  '/tariff': ['revenue.tariff.view'],

  // Invoice
  '/invoice/vendor': ['fleet.vendorinvoice.view'],
  '/invoice/vendor-payments': ['fleet.vendorinvoice.view'],
  '/invoice/credit-notes': ['fleet.vendorinvoice.view'],
  '/invoice/work-order': ['revenue.charge.view', 'revenue.invoice.issue'],

  // Inquiry
  '/inquiry/work-orders': ['fleet.report.view'],
  '/inquiry/wip': ['fleet.report.view'],
  '/inquiry/purchase-orders': ['fleet.report.view'],
  '/inquiry/tire-changes': ['fleet.report.view'],
  '/inquiry/truck-movements': ['fleet.report.view'],

  // Reports
  '/reports': ['fleet.report.view'],
};

const PREFIXES = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

/** The rule for a path, or null when no rule covers it. */
export function ruleFor(pathname: string): readonly string[] | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const prefix = PREFIXES.find((p) => path === p || path.startsWith(`${p}/`));
  return prefix ? ROUTE_PERMISSIONS[prefix] : null;
}

/**
 * Can the user open this page? `can(permission)` answers for one code; `isFleetUser`
 * says whether they hold any fleet permission at all (needed for `[]` rules).
 */
export function canOpen(pathname: string, can: (permission: string) => boolean, isFleetUser: boolean): boolean {
  const rule = ruleFor(pathname);
  if (rule === null) return false;
  if (rule.length === 0) return isFleetUser;
  return rule.some(can);
}
