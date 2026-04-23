import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const RECENT_WO = [
  { id: "WO-2024-0089", equipment: "TRK-001 — Isuzu NPR", type: "Corrective", status: "In Progress", priority: "High", date: "22 Apr 2026" },
  { id: "WO-2024-0088", equipment: "TRK-004 — Hino 300", type: "Preventive", status: "Pending", priority: "Normal", date: "21 Apr 2026" },
  { id: "WO-2024-0087", equipment: "FKL-002 — Toyota Forklift", type: "Corrective", status: "Completed", priority: "Normal", date: "20 Apr 2026" },
  { id: "WO-2024-0086", equipment: "TRK-007 — Isuzu FRR", type: "Preventive", status: "In Progress", priority: "Normal", date: "19 Apr 2026" },
  { id: "WO-2024-0085", equipment: "TRK-002 — Hino 500", type: "Corrective", status: "Completed", priority: "High", date: "18 Apr 2026" },
];

const statusConfig: Record<string, { label: string; className: string }> = {
  "In Progress": { label: "In Progress", className: "bg-primary-100 text-primary-700" },
  "Pending": { label: "Pending", className: "bg-warning-100 text-warning-700" },
  "Completed": { label: "Completed", className: "bg-success-100 text-success-700" },
};

const priorityConfig: Record<string, string> = {
  "High": "bg-error-100 text-error-700",
  "Normal": "bg-gray-100 text-gray-600",
};

export function RecentWorkOrders() {
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
          {RECENT_WO.map((wo) => (
            <div key={wo.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-gray-900">{wo.id}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig[wo.priority]}`}>
                    {wo.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{wo.equipment} · {wo.type}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[wo.status]?.className}`}>
                  {wo.status}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{wo.date}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
