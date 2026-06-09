import { useEffect, useState, memo } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Users, Crown, Shield, Wrench, Search, Circle, Hash } from "lucide-react";

type MemberWithProfile = {
  user_id: string;
  level: number;
  profile: {
    username: string; display_name: string | null; avatar_url: string | null;
    name_color: string | null; status_text: string | null; status: string | null;
  } | null;
};

const STATUS_META: Record<string, { label: string; dot: string; labelColor: string }> = {
  online:  { label: "Online",  dot: "bg-emerald-500",  labelColor: "text-emerald-500/80" },
  idle:    { label: "Ausente", dot: "bg-yellow-500",   labelColor: "text-yellow-500/80" },
  dnd:     { label: "Ocupado", dot: "bg-red-500",      labelColor: "text-red-500/80" },
  offline: { label: "Offline", dot: "bg-muted-foreground/30", labelColor: "text-muted-foreground/60" },
};

function statusPriority(s: string) {
  if (s === "online") return 0;
  if (s === "idle") return 1;
  if (s === "dnd") return 2;
  return 3;
}

export function MemberList({
  serverId, presence,
}: {
  serverId: string;
  presence: Map<string, string>;
}) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!serverId) return;
    supabase.from("server_members").select("user_id, level").eq("server_id", serverId).then(async ({ data }) => {
      if (!data?.length) return;
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, name_color, status_text, status")
        .in("id", userIds);
      const profMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      setMembers(data.map((m) => ({ user_id: m.user_id, level: m.level, profile: profMap[m.user_id] || null })));
    });
  }, [serverId]);

  const filtered = [...members]
    .sort((a, b) => {
      const aOrd = statusPriority(presence.get(a.user_id) || "offline");
      const bOrd = statusPriority(presence.get(b.user_id) || "offline");
      if (aOrd !== bOrd) return aOrd - bOrd;
      if (a.level !== b.level) return b.level - a.level;
      return (a.profile?.username || "").localeCompare(b.profile?.username || "");
    })
    .filter((m) => {
      if (!q.trim()) return true;
      const lq = q.toLowerCase();
      return (
        m.profile?.username?.toLowerCase().includes(lq) ||
        m.profile?.display_name?.toLowerCase().includes(lq)
      );
    });

  const groups = ["online", "idle", "dnd", "offline"].map((key) => ({
    key,
    ...STATUS_META[key],
    members: filtered.filter((m) => {
      const s = presence.get(m.user_id) || "offline";
      return key === "offline" ? (s === "offline" || !presence.has(m.user_id)) : s === key;
    }),
  }));

  const onlineCount = filtered.filter((m) => (presence.get(m.user_id) || "offline") !== "offline").length;

  return (
    <div className="w-56 md:w-60 border-l border-border bg-card/30 flex-col flex h-full">
      <div className="h-[3.25rem] border-b border-border flex items-center px-4 gap-2.5 shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center">
          <Users className="h-3.5 w-3.5 text-primary/70" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-tight truncate">Membros</p>
          <p className="text-[10px] text-muted-foreground/60 leading-tight flex items-center gap-1">
            <Circle className={`h-1.5 w-1.5 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}`} />
            {onlineCount} online · {filtered.length} total
          </p>
        </div>
      </div>
      <div className="px-2.5 pt-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar membro..."
            className="pl-7 h-8 text-xs bg-accent/20 border-border/60 focus:bg-accent/40 transition-colors"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 px-1.5 pb-2">
        {filtered.length === 0 && q.trim() && (
          <div className="flex flex-col items-center py-10 text-muted-foreground/60">
            <Hash className="h-8 w-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">Ninguém encontrado</p>
            <p className="text-[10px]">Tente outro termo de busca</p>
          </div>
        )}

        {groups.map((grp) => {
          if (!grp.members.length) return null;
          return (
            <div key={grp.key} className="mb-2">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <div className={`h-2 w-2 rounded-full ${grp.dot}`} />
                <p className={`text-[10px] uppercase tracking-wider font-semibold ${grp.labelColor}`}>
                  {grp.label}
                </p>
                <span className="text-[10px] text-muted-foreground/40 font-mono ml-auto">{grp.members.length}</span>
              </div>
              <div className="space-y-px" style={{ contentVisibility: "auto" }}>
                {grp.members.map((m) => <MemberRow key={m.user_id} member={m} status={grp.key} />)}
              </div>
            </div>
          );
        })}
      </ScrollArea>
    </div>
  );
}

const MemberRow = memo(function MemberRow({ member, status }: { member: MemberWithProfile; status: string }) {
  const p = member.profile;
  const dot = STATUS_META[status]?.dot || STATUS_META.offline.dot;

  const icon = member.level >= 100 ? <Crown className="h-3 w-3 text-yellow-500" />
    : member.level >= 80 ? <Shield className="h-3 w-3 text-blue-400" />
    : member.level >= 60 ? <Wrench className="h-3 w-3 text-green-400" />
    : null;

  return (
    <Link
      to="/app/u/$slug"
      params={{ slug: member.user_id }}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-accent/30 transition-colors group"
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 md:h-7 md:w-7 ring-1 ring-border/30 group-hover:ring-primary/40 transition-all">
          <AvatarImage src={p?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px] bg-muted/50">{(p?.username || "?")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[2.5px] border-card ${dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm truncate font-medium" style={p?.name_color ? { color: p.name_color } : undefined}>
            {p?.display_name || p?.username || "…"}
          </span>
          {icon && <span className="shrink-0">{icon}</span>}
        </div>
        {p?.status_text && status !== "offline" && (
          <p className="text-[10px] text-muted-foreground/60 truncate leading-tight">{p.status_text}</p>
        )}
      </div>
    </Link>
  );
});
