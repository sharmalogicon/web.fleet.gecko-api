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

export interface NavSubItem {
  title: string;
  href: string;
  icon?: LucideIcon;
}

export interface NavItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  items?: NavSubItem[];
}

export const NAVIGATION: NavItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    title: 'Master Data',
    icon: Settings,
    items: [
      { title: 'Drivers', href: '/master/drivers' },
      { title: 'Equipment', href: '/master/equipment' },
      { title: 'Equipment Types', href: '/master/equipment-types' },
      { title: 'Stock Profiles', href: '/master/stock' },
      { title: 'Stock & Labor Prices', href: '/master/stock-labor-prices' },
      { title: 'Transporters', href: '/master/transporters' },
    ],
  },
  {
    title: 'Fleet Operations',
    icon: Wrench,
    items: [
      { title: 'Work Requests', href: '/fleet/work-requests' },
      { title: 'Work Orders', href: '/fleet/work-orders' },
      { title: 'WO Monitoring', href: '/fleet/work-orders/monitoring' },
      { title: 'PM Scheduler', href: '/fleet/pm-scheduler' },
      { title: 'Service Types', href: '/fleet/service-types' },
    ],
  },
  {
    title: 'Fuel & Meters',
    icon: Fuel,
    items: [
      { title: 'Fuel Logs', href: '/fleet/fuel-logs' },
      { title: 'Fuel Approval', href: '/fleet/fuel-logs/approval' },
      { title: 'Meter Logs', href: '/fleet/meter-logs' },
      { title: 'Meter HR Logs', href: '/fleet/meter-hr-logs' },
    ],
  },
  {
    title: 'Inventory',
    icon: Package,
    items: [
      { title: 'Goods Requests', href: '/fleet/goods-requests' },
      { title: 'Goods Requisitions', href: '/fleet/goods-requisitions' },
      { title: 'Purchase Orders', href: '/fleet/purchase-orders' },
      { title: 'Goods Receipts', href: '/fleet/goods-receipts' },
      { title: 'Goods Adjustments', href: '/fleet/goods-adjustments' },
      { title: 'Return to Vendor', href: '/fleet/return-to-vendor' },
      { title: 'Spare Parts', href: '/fleet/spare-parts/monitoring' },
    ],
  },
  {
    title: 'Tire Management',
    icon: Circle,
    items: [
      { title: 'Tire Profiles', href: '/fleet/tires/profiles' },
      { title: 'Tire Changes', href: '/fleet/tires/changes' },
      { title: 'Tire Maintenance', href: '/fleet/tires/maintenance' },
      { title: 'Pending Recap', href: '/fleet/tires/pending-recap' },
    ],
  },
  {
    title: 'Incidents',
    icon: AlertTriangle,
    items: [
      { title: 'Accident Reports', href: '/fleet/accidents' },
      { title: 'Insurance Claims', href: '/fleet/insurance-claims' },
      { title: 'Traffic Violations', href: '/fleet/traffic-violations' },
    ],
  },
  {
    title: 'Tariff',
    icon: DollarSign,
    items: [
      { title: 'Customer Rates', href: '/tariff/customer-rates' },
      { title: 'Standard Rates', href: '/tariff/standard-rates' },
    ],
  },
  {
    title: 'Invoice',
    icon: FileText,
    items: [
      { title: 'Vendor Invoices', href: '/invoice/vendor' },
      { title: 'Unbilled Invoices', href: '/invoice/vendor/unbilled' },
      { title: 'WO Invoices', href: '/invoice/work-order' },
      { title: 'Credit Notes', href: '/invoice/credit-notes' },
    ],
  },
  {
    title: 'Inquiry',
    icon: Search,
    items: [
      { title: 'Work Order Inquiry', href: '/inquiry/work-orders' },
      { title: 'WIP Inquiry', href: '/inquiry/wip' },
      { title: 'Purchase Order Inquiry', href: '/inquiry/purchase-orders' },
      { title: 'Tire Change Inquiry', href: '/inquiry/tire-changes' },
      { title: 'Truck Movement', href: '/inquiry/truck-movements' },
    ],
  },
  {
    title: 'Reports',
    icon: BarChart3,
    items: [
      { title: 'Management Reports', href: '/reports/management' },
      { title: 'Operation Reports', href: '/reports/operations' },
    ],
  },
];
