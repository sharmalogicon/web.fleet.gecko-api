import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export interface RecentWorkOrder {
  workOrderId: string;
  documentNo: string;
  assetCode: string;
  woType: string;
  status: string;
  priority: string;
  documentDate: string;
}

const statusConfig: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  OPEN: "bg-warning-100 text-warning-700",
  IN_PROGRESS: "bg-primary-100 text-primary-700",
  ON_HOLD: "bg-warning-100 text-warning-700",
  COMPLETED: "bg-success-100 text-success-700",
  CLOSED: "bg-success-100 text-success-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const priorityConfig: Record<string, string> = {
  URGENT: "bg-error-100 text-error-700",
  HIGH: "bg-error-100 text-error-700",
  NORMAL: "bg-gray-100 text-gray-600",
  LOW: "bg-gray-100 text-gray-500",
};

const label = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const fmt = (d: string) => new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** The latest 5 work orders (GET /dashboard). */
export function RecentWorkOrders({ items }: { items: RecentWorkOrder[] }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Recent Work Orders</CardTitle>
          <Link href="/fleet/work-orders" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-400">No work orders yet.</p>}
          {items.map((wo) => (
            <Link key={wo.workOrderId} href={`/fleet/work-orders/${wo.workOrderId}`} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900">{wo.documentNo}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[wo.priority] ?? priorityConfig.NORMAL}`}>
                    {label(wo.priority)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{wo.assetCode} · {label(wo.woType)}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[wo.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {label(wo.status)}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{fmt(wo.documentDate)}</p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
