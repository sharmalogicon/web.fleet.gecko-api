import {
  StatCard,
  RecentWorkOrders,
  QuickActions,
  UpcomingPM,
  FleetStatus,
} from '@/components/dashboard';
import {
  Wrench,
  Calendar,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Fuel,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fleet Dashboard</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Overview of your fleet operations, maintenance, and vehicle status.
        </p>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Active Work Orders"
          value="12"
          change={8.3}
          changeLabel="vs last month"
          icon={<Wrench size={20} />}
          iconColor="bg-primary-50 text-primary-600"
        />
        <StatCard
          title="Pending PM"
          value="7"
          change={-12.5}
          changeLabel="vs last month"
          icon={<Calendar size={20} />}
          iconColor="bg-warning-50 text-warning-600"
        />
        <StatCard
          title="Open PO"
          value="23"
          icon={<ShoppingCart size={20} />}
          iconColor="bg-accent-50 text-accent-600"
        />
        <StatCard
          title="Total Vehicles"
          value="30"
          icon={<Truck size={20} />}
          iconColor="bg-success-50 text-success-600"
        />
        <StatCard
          title="Overdue Service"
          value="2"
          change={100}
          changeLabel="vs last month"
          icon={<AlertTriangle size={20} />}
          iconColor="bg-error-50 text-error-600"
        />
        <StatCard
          title="Fuel (Apr)"
          value="4,820 L"
          change={-5.1}
          changeLabel="vs Mar"
          icon={<Fuel size={20} />}
          iconColor="bg-info-50 text-info-600"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <QuickActions />
          <RecentWorkOrders />
        </div>

        {/* Right Column — 1/3 width */}
        <div className="space-y-6">
          <FleetStatus />
          <UpcomingPM />
        </div>
      </div>
    </div>
  );
}
