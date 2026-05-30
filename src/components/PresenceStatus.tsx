import { getSocket } from "@/lib/socket";
import { useAuth } from "@/hooks/use-auth";
import { useIdle } from "@/lib/use-idle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { CircleIcon, Check } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  online: "Online",
  idle: "Ausente",
  dnd: "Ocupado",
  invisible: "Invisível",
};

const STATUS_COLORS: Record<string, string> = {
  online: "text-emerald-500",
  idle: "text-yellow-500",
  dnd: "text-red-500",
  invisible: "text-muted-foreground/50",
};

const STATUS_DOTS: Record<string, string> = {
  online: "bg-emerald-500",
  idle: "bg-yellow-500",
  dnd: "bg-red-500",
  invisible: "bg-muted-foreground/30",
};

export function StatusDot({ status, size = "sm" }: { status: string; size?: "sm" | "md" | "lg" }) {
  const s = size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const dot = STATUS_DOTS[status] || STATUS_DOTS.invisible;
  return <span className={`inline-block ${s} rounded-full ${dot} border border-card`} title={STATUS_LABELS[status] || "Offline"} />;
}

export function StatusPicker({ currentStatus, onSet }: { currentStatus?: string; onSet?: (s: string) => void }) {
  const { user } = useAuth();

  async function setStatus(status: string) {
    if (!user) return;
    await supabase.from("profiles").update({ status }).eq("id", user.id);
    const s = getSocket(user.id);
    s.emit("presence:set", status);
    onSet?.(status);
  }

  // Auto-idle detection
  const idle = useIdle(5 * 60 * 1000);
  useEffect(() => {
    if (idle && currentStatus === "online") {
      setStatus("idle");
    }
  }, [idle]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors">
          <StatusDot status={currentStatus || "online"} size="sm" />
          <span className="hidden sm:inline text-muted-foreground">{STATUS_LABELS[currentStatus || "online"]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {["online", "idle", "dnd", "invisible"].map((s) => (
          <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="flex items-center gap-2">
            <CircleIcon className={`h-3.5 w-3.5 fill-current ${STATUS_COLORS[s]}`} />
            <span className="flex-1">{STATUS_LABELS[s]}</span>
            {(currentStatus || "online") === s && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-[10px] text-muted-foreground">Idle automático após 5 min</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
