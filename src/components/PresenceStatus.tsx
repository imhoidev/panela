import { useRealtimeSocket } from "@/hooks/useRealtime";
import { useAuth } from "@/hooks/use-auth";
import { useIdle } from "@/lib/use-idle";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CircleIcon, Check, MessageCircle } from "lucide-react";

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
  return <span className={`inline-block ${s} rounded-full ${dot} border-2 border-card`} title={STATUS_LABELS[status] || "Offline"} />;
}

export function StatusText({ statusText }: { statusText?: string | null }) {
  if (!statusText) return null;
  return (
    <span className="text-[11px] text-muted-foreground/60 italic truncate max-w-[120px]" title={statusText}>
      {statusText}
    </span>
  );
}

export function StatusPicker({ currentStatus, statusText: initialText, onSet }: { currentStatus?: string; statusText?: string | null; onSet?: (s: string) => void }) {
  const { user } = useAuth();
  const { emit } = useRealtimeSocket();
  const [statusText, setStatusText] = useState(initialText ?? "");
  const [editingText, setEditingText] = useState(false);

  async function setStatus(status: string) {
    if (!user) return;
    await supabase.from("profiles").update({ status }).eq("id", user.id);
    emit("presence:set", status);
    onSet?.(status);
  }

  async function saveStatusText() {
    if (!user) return;
    await supabase.from("profiles").update({ status_text: statusText.trim() || null }).eq("id", user.id);
    setEditingText(false);
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
      <DropdownMenuContent align="start" className="w-52">
        {["online", "idle", "dnd", "invisible"].map((s) => (
          <DropdownMenuItem key={s} onClick={() => setStatus(s)} className="flex items-center gap-2">
            <CircleIcon className={`h-3.5 w-3.5 fill-current ${STATUS_COLORS[s]}`} />
            <span className="flex-1">{STATUS_LABELS[s]}</span>
            {(currentStatus || "online") === s && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <MessageCircle className="h-3 w-3" />
            <span>Status personalizado</span>
          </div>
          {editingText ? (
            <div className="flex gap-1">
              <Input value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={64}
                placeholder="O que está acontecendo?" className="h-7 text-xs flex-1"
                onKeyDown={(e) => { if (e.key === "Enter") saveStatusText(); if (e.key === "Escape") setEditingText(false); }} />
              <button onClick={saveStatusText} className="h-7 w-7 rounded grid place-items-center hover:bg-accent text-primary">
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingText(true)}
              className="w-full text-left text-xs text-muted-foreground/60 hover:text-foreground py-1 rounded px-1 hover:bg-accent/50 transition-colors">
              {initialText ? <span className="italic">&ldquo;{initialText}&rdquo;</span> : "Adicionar status..."}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        <p className="px-2 py-1 text-[10px] text-muted-foreground">Ausente automático após 5 min</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
