import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

const STYLE: Record<string, { label: string; color: string; textColor: string }> = {
  ACTIVE: { label: "Active", color: "bg-success-500", textColor: "text-success-700" },
  UNDER_MAINTENANCE: { label: "Under Maintenance", color: "bg-warning-500", textColor: "text-warning-700" },
  IDLE: { label: "Idle", color: "bg-gray-400", textColor: "text-gray-600" },
  OUT_OF_SERVICE: { label: "Out of Service", color: "bg-error-500", textColor: "text-error-700" },
};

/** Counts per state (GET /dashboard `fleetStatus`); `labels` = translated names by key. */
export function FleetStatus({ items, labels }: { items: { key: string; count: number }[]; labels?: Record<string, string> }) {
  const STATUS_DATA = items.map((i) => ({ ...STYLE[i.key], label: labels?.[i.key] ?? STYLE[i.key]?.label ?? i.key, count: i.count }));
  const total = STATUS_DATA.reduce((sum, s) => sum + s.count, 0);
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
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
              style={{ width: `${pct(s.count)}%` }}
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
                <span className="text-xs text-gray-400">({Math.round(pct(s.count))}%)</span>
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
