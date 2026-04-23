import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const STATUS_DATA = [
  { label: "Active", count: 18, color: "bg-success-500", textColor: "text-success-700" },
  { label: "Under Maintenance", count: 4, color: "bg-warning-500", textColor: "text-warning-700" },
  { label: "Idle", count: 6, color: "bg-gray-400", textColor: "text-gray-600" },
  { label: "Out of Service", count: 2, color: "bg-error-500", textColor: "text-error-700" },
];

const total = STATUS_DATA.reduce((sum, s) => sum + s.count, 0);

export function FleetStatus() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Fleet Status</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress bar */}
        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-0.5">
          {STATUS_DATA.map((s) => (
            <div
              key={s.label}
              className={cn("h-full transition-all", s.color)}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          ))}
        </div>

        <div className="space-y-2">
          {STATUS_DATA.map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 rounded-full", s.color)} />
                <span className="text-sm text-gray-600">{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", s.textColor)}>{s.count}</span>
                <span className="text-xs text-gray-400">({Math.round((s.count / total) * 100)}%)</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Total Equipment</span>
            <span className="font-bold text-gray-900">{total} units</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
