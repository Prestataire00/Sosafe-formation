import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatColor = "primary" | "success" | "warning" | "info" | "purple" | "orange" | "pink" | "destructive";

const colorMap: Record<StatColor, { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  info: { bg: "bg-info/10", text: "text-info" },
  purple: { bg: "bg-purple/10", text: "text-purple" },
  orange: { bg: "bg-orange/10", text: "text-orange" },
  pink: { bg: "bg-pink/10", text: "text-pink" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: StatColor;
  trend?: string;
  loading?: boolean;
  testId?: string;
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, color = "primary", trend, loading, testId, className }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <Card className={cn("relative overflow-hidden", className)} data-testid={testId}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <p className="text-3xl font-bold tracking-tight" data-testid={testId ? `${testId}-value` : undefined}>{value}</p>
                {(subtitle || trend) && (
                  <p className="text-xs text-muted-foreground">
                    {trend && <span className={cn("font-medium", trend.startsWith("+") ? "text-success" : trend.startsWith("-") ? "text-destructive" : "")}>{trend} </span>}
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          <div className={cn("flex items-center justify-center w-11 h-11 rounded-xl", colors.bg)}>
            <Icon className={cn("w-5 h-5", colors.text)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
