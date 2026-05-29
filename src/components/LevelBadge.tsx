import { Badge } from "@/components/ui/badge";
import { Sparkles, Star } from "lucide-react";

const LEVELS = [
  { min: 0, label: "Novato", color: "text-muted-foreground" },
  { min: 10, label: "Frequente", color: "text-green-400" },
  { min: 25, label: "Membro", color: "text-blue-400" },
  { min: 50, label: "Veterano", color: "text-purple-400" },
  { min: 100, label: "Lenda", color: "text-yellow-500" },
  { min: 200, label: "Panela de Ouro", color: "text-amber-500" },
];

export function LevelBadge({ xp, size = "sm" }: { xp?: number; size?: "sm" | "md" }) {
  const total = xp || 0;
  const level = Math.floor(Math.sqrt(total / 10));
  const label = [...LEVELS].reverse().find((l) => level >= l.min)?.label || "Novato";
  const nextLevelXp = (level + 1) ** 2 * 10;
  const currentLevelXp = level ** 2 * 10;
  const progress = nextLevelXp > currentLevelXp ? (total - currentLevelXp) / (nextLevelXp - currentLevelXp) : 1;

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${size === "md" ? "text-xs" : ""}`}>
        <Star className={`${size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} text-amber-400`} />
        Lv.{level} {label}
      </span>
      {size === "md" && (
        <div className="w-16 h-1.5 rounded-full bg-accent overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      )}
    </div>
  );
}
