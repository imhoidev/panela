import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label?: string;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const percent = Math.round(ratio * 100);
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label ?? "Progresso"}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
