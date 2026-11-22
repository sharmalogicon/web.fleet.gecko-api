import {
  LayoutDashboard,
  Users,
  Truck,
  Wrench,
  Fuel,
  Gauge,
  ShoppingCart,
  Package,
  RotateCcw,
  Circle,
  AlertTriangle,
  Shield,
  DollarSign,
  FileText,
  Search,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { canOpen } from '@/lib/access/routeGuard';

export interface NavSubItem {
  title: string;
  titleKey: string;
  href: string;
  icon?: LucideIcon;
}

export interface NavItem {
  title: string;
  titleKey: string;
  icon: LucideIcon;
  href?: string;
  items?: NavSubItem[];
}

export const NAVIGATION: NavItem[] = [
  {
    title: 'Dashboard',
    titleKey: 'nav.dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Master Data',
    titleKey: 'nav.master',
    icon: Settings,
    items: [
      { title: 'Drivers', titleKey: 'nav.drivers', href: '/master/drivers' },
      { title: 'Technicians', titleKey: 'nav.technicians', href: '/master/technicians' },
      { title: 'Equipment', titleKey: 'nav.equipment', href: '/master/equipment' },
      { title: 'Equipment Types', titleKey: 'nav.equipmentTypes', href: '/master/equipment-types' },
      { title: 'Stock Profiles', titleKey: 'nav.stock', href: '/master/stock' },
      { title: 'Stores', titleKey: 'nav.stores', href: '/master/stores' },
      { title: 'Stock & Labor Prices', titleKey: 'nav.stockLaborPrices', href: '/master/stock-labor-prices' },
      { title: 'Transporters', titleKey: 'nav.transporters', href: '/master/transporters' },
      { title: 'Fleet Setup', titleKey: 'nav.fleetSetup', href: '/master/fleet-setup' },
    ],
  },
  {
    title: 'Fleet Operations',
    titleKey: 'nav.fleet',
    icon: Wrench,
    items: [
      { title: 'Work Requests', titleKey: 'nav.workRequests', href: '/fleet/work-requests' },
      { title: 'Inspections', titleKey: 'nav.inspections', href: '/fleet/inspections' },
      { title: 'Defects', titleKey: 'nav.defects', href: '/fleet/defects' },
      { title: 'Inspection Checklists', titleKey: 'nav.checklists', href: '/fleet/inspections/checklists' },
      { title: 'Work Orders', titleKey: 'nav.workOrders', href: '/fleet/work-orders' },
      { title: 'WO Monitoring', titleKey: 'nav.woMonitoring', href: '/fleet/work-orders/monitoring' },
      { title: 'Recharges', titleKey: 'nav.recharges', href: '/fleet/recharges' },
      { title: 'PM Scheduler', titleKey: 'nav.pmScheduler', href: '/fleet/pm-scheduler' },
      { title: 'PM Due', titleKey: 'nav.pmDue', href: '/fleet/pm-due' },
      { title: 'Service Types', titleKey: 'nav.serviceTypes', href: '/fleet/service-types' },
    ],
  },
  {
    title: 'Fuel & Meters',
    titleKey: 'nav.fuelMeters',
    icon: Fuel,
    items: [
      { title: 'Fuel Logs', titleKey: 'nav.fuelLogs', href: '/fleet/fuel-logs' },
      { title: 'Fuel Approval', titleKey: 'nav.fuelApproval', href: '/fleet/fuel-logs/approval' },
      { title: 'Meter Logs', titleKey: 'nav.meterLogs', href: '/fleet/meter-logs' },
      { title: 'Meter HR Logs', titleKey: 'nav.meterHrLogs', href: '/fleet/meter-hr-logs' },
    ],
  },
  {
    title: 'Inventory',
    titleKey: 'nav.inventory',
    icon: Package,
    items: [
      { title: 'Goods Requests', titleKey: 'nav.goodsRequests', href: '/fleet/goods-requests' },
      { title: 'Goods Requisitions', titleKey: 'nav.goodsRequisitions', href: '/fleet/goods-requisitions' },
      { title: 'Purchase Orders', titleKey: 'nav.purchaseOrders', href: '/fleet/purchase-orders' },
      { title: 'Goods Receipts', titleKey: 'nav.goodsReceipts', href: '/fleet/goods-receipts' },
      { title: 'Goods Adjustments', titleKey: 'nav.goodsAdjustments', href: '/fleet/goods-adjustments' },
      { title: 'Stock Counts', titleKey: 'nav.stockCounts', href: '/fleet/stock-counts' },
      { title: 'Return to Vendor', titleKey: 'nav.returnToVendor', href: '/fleet/return-to-vendor' },
      { title: 'Spare Parts', titleKey: 'nav.spareParts', href: '/fleet/spare-parts/monitoring' },
    ],
  },
  {
    title: 'Tire Management',
    titleKey: 'nav.tireManagement',
    icon: Circle,
    items: [
      { title: 'Tire Profiles', titleKey: 'nav.tireProfiles', href: '/fleet/tires/profiles' },
      { title: 'Tire Axle Map', titleKey: 'nav.tireAxleMap', href: '/fleet/tires/axle-map' },
      { title: 'Tire Axle Map 3D', titleKey: 'nav.tireAxleMap3d', href: '/fleet/tires/axle-map-3d' },
      { title: 'Tire Bay', titleKey: 'nav.tireBay', href: '/fleet/tires/bay' },
      { title: 'Tire Changes', titleKey: 'nav.tireChanges', href: '/fleet/tires/changes' },
      { title: 'Tire Maintenance', titleKey: 'nav.tireMaintenance', href: '/fleet/tires/maintenance' },
      { title: 'Pending Recap', titleKey: 'nav.pendingRecap', href: '/fleet/tires/pending-recap' },
    ],
  },
  {
    title: 'Incidents',
    titleKey: 'nav.incidents',
    icon: AlertTriangle,
    items: [
      { title: 'Accident Reports', titleKey: 'nav.accidents', href: '/fleet/accidents' },
      { title: 'Insurance Claims', titleKey: 'nav.insuranceClaims', href: '/fleet/insurance-claims' },
      { title: 'Traffic Violations', titleKey: 'nav.trafficViolations', href: '/fleet/traffic-violations' },
    ],
  },
  {
    title: 'Tariff',
    titleKey: 'nav.tariff',
    icon: DollarSign,
    items: [
      { title: 'Customer Rates', titleKey: 'nav.customerRates', href: '/tariff/customer-rates' },
      { title: 'Standard Rates', titleKey: 'nav.standardRates', href: '/tariff/standard-rates' },
    ],
  },
  {
    title: 'Invoice',
    titleKey: 'nav.invoice',
    icon: FileText,
    items: [
      { title: 'Vendor Invoices', titleKey: 'nav.vendorInvoices', href: '/invoice/vendor' },
      { title: 'Unbilled Invoices', titleKey: 'nav.unbilledInvoices', href: '/invoice/vendor/unbilled' },
      { title: 'WO Invoices', titleKey: 'nav.woInvoices', href: '/invoice/work-order' },
      { title: 'Credit Notes', titleKey: 'nav.creditNotes', href: '/invoice/credit-notes' },
    ],
  },
  {
    title: 'Inquiry',
    titleKey: 'nav.inquiry',
    icon: Search,
    items: [
      { title: 'Work Order Inquiry', titleKey: 'nav.inquiryWorkOrders', href: '/inquiry/work-orders' },
      { title: 'WIP Inquiry', titleKey: 'nav.inquiryWIP', href: '/inquiry/wip' },
      { title: 'Purchase Order Inquiry', titleKey: 'nav.inquiryPurchaseOrders', href: '/inquiry/purchase-orders' },
      { title: 'Tire Change Inquiry', titleKey: 'nav.inquiryTireChanges', href: '/inquiry/tire-changes' },
      { title: 'Truck Movement', titleKey: 'nav.inquiryTruckMovements', href: '/inquiry/truck-movements' },
    ],
  },
  {
    title: 'Reports',
    titleKey: 'nav.reports',
    icon: BarChart3,
    items: [
      { title: 'Management Reports', titleKey: 'nav.managementReports', href: '/reports/management' },
      { title: 'Operation Reports', titleKey: 'nav.operationsReports', href: '/reports/operations' },
    ],
  },
];

/**
 * The menu without the links the user cannot open (route-guard map in
 * src/lib/access/routeGuard.ts); a group with no visible link is dropped.
 */
export function visibleNavigation(
  items: NavItem[],
  can: (permission: string) => boolean,
  isFleetUser: boolean,
): NavItem[] {
  const opens = (href: string) => canOpen(href, can, isFleetUser);
  const result: NavItem[] = [];
  for (const item of items) {
    if (item.items) {
      const visible = item.items.filter((sub) => opens(sub.href));
      if (visible.length) result.push({ ...item, items: visible });
    } else if (!item.href || opens(item.href)) {
      result.push(item);
    }
  }
  return result;
}
