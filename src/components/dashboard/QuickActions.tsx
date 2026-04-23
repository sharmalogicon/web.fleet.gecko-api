import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Wrench,
  Fuel,
  ShoppingCart,
  AlertTriangle,
  FileText,
  ClipboardList,
} from "lucide-react";

const ACTIONS = [
  { title: "New Work Order", href: "/fleet/work-orders/new", icon: Wrench, color: "bg-primary-50 text-primary-600 hover:bg-primary-100" },
  { title: "Fuel Log Entry", href: "/fleet/fuel-logs/new", icon: Fuel, color: "bg-success-50 text-success-600 hover:bg-success-100" },
  { title: "Purchase Order", href: "/fleet/purchase-orders/new", icon: ShoppingCart, color: "bg-accent-50 text-accent-600 hover:bg-accent-100" },
  { title: "Accident Report", href: "/fleet/accidents/new", icon: AlertTriangle, color: "bg-error-50 text-error-600 hover:bg-error-100" },
  { title: "Vendor Invoice", href: "/invoice/vendor/new", icon: FileText, color: "bg-info-50 text-info-600 hover:bg-info-100" },
  { title: "Work Request", href: "/fleet/work-requests/new", icon: ClipboardList, color: "bg-warning-50 text-warning-600 hover:bg-warning-100" },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-colors text-center ${action.color}`}
              >
                <Icon size={22} />
                <span className="text-xs font-medium leading-tight">{action.title}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
