import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export interface UpcomingPmItem {
  key: string;
  equipment: string;
  service: string;
  dueDate: string;
  /** Days to the due date; null when due by km only. */
  daysLeft: number | null;
  /** "12,000 km left" style text when due by meter. */
  meterText?: string;
  overdue: boolean;
}

/** PM tasks not OK, earliest due first (GET /dashboard `upcomingPm`). */
export function UpcomingPM({ items }: { items: UpcomingPmItem[] }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Upcoming PM Schedule</CardTitle>
          <Link href="/fleet/pm-due" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-gray-400">Nothing due.</p>}
          {items.map((item) => (
            <div key={item.key} className="flex items-start gap-3">
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
                <p className="text-sm font-medium text-gray-900">{item.equipment}</p>
                <p className="text-xs text-gray-500 truncate">{item.service}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-gray-700">{item.dueDate || item.meterText}</p>
                <p className={cn("text-xs font-semibold", item.overdue ? "text-error-600" : "text-warning-600")}>
                  {item.daysLeft === null ? (item.overdue ? "Overdue" : item.meterText ?? "") : item.overdue ? `${Math.abs(item.daysLeft)}d overdue` : `${item.daysLeft}d left`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
