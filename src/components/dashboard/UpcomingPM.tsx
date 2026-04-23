import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const UPCOMING = [
  { equipment: "TRK-001", name: "Isuzu NPR", service: "Oil Change + Filter", dueDate: "24 Apr 2026", daysLeft: 2, overdue: false },
  { equipment: "TRK-003", name: "Hino 300", service: "Tyre Rotation", dueDate: "25 Apr 2026", daysLeft: 3, overdue: false },
  { equipment: "FKL-001", name: "Toyota Forklift", service: "Full PM Service", dueDate: "20 Apr 2026", daysLeft: -2, overdue: true },
  { equipment: "TRK-008", name: "Isuzu FRR", service: "Brake Inspection", dueDate: "28 Apr 2026", daysLeft: 6, overdue: false },
];

export function UpcomingPM() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming PM Schedule</CardTitle>
          <Link href="/fleet/pm-scheduler" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {UPCOMING.map((item) => (
            <div key={item.equipment} className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                item.overdue ? "bg-error-50" : "bg-warning-50"
              )}>
                {item.overdue ? (
                  <AlertCircle size={16} className="text-error-600" />
                ) : (
                  <Calendar size={16} className="text-warning-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {item.equipment} — {item.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{item.service}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-gray-700">{item.dueDate}</p>
                <p className={cn("text-xs font-semibold", item.overdue ? "text-error-600" : "text-warning-600")}>
                  {item.overdue ? `${Math.abs(item.daysLeft)}d overdue` : `${item.daysLeft}d left`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
