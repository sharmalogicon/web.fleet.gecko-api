import * as React from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  iconColor?: string;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, changeLabel, icon, className, iconColor = "bg-primary-50 text-primary-600" }, ref) => {
    const isPositive = change !== undefined && change >= 0;
    const hasChange = change !== undefined;

    return (
      <Card ref={ref} className={cn("relative", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">
              {title}
            </CardTitle>
            {icon && (
              <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg", iconColor)}>
                {icon}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-1.5">
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {hasChange && (
              <div className="flex items-center gap-1 text-sm">
                {isPositive ? (
                  <ArrowUp className="h-4 w-4 text-success-600" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-error-600" />
                )}
                <span className={cn("font-medium", isPositive ? "text-success-600" : "text-error-600")}>
                  {Math.abs(change)}%
                </span>
                {changeLabel && (
                  <span className="text-gray-500">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

StatCard.displayName = "StatCard";
