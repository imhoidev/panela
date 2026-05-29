import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Users, Crown, Shield, Wrench, Search, Circle } from "lucide-react";

type MemberWithProfile = {
  user_id: string;
  level: number;
  profile: {
    username: string; display_name: string | null; avatar_url: string | null;
    name_color: string | null; status_text: string | null; status: string | null;
  } | null;
};

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

  const sorted = [...members].sort((a, b) => {
    // Online first, then by level desc, then by name
    const aStatus = presence.get(a.user_id) || "offline";
    const bStatus = presence.get(b.user_id) || "offline";
    const aOnline = aStatus !== "offline" ? 1 : 0;
    const bOnline = bStatus !== "offline" ? 1 : 0;
    if (aOnline !== bOnline) return bOnline - aOnline;
    if (a.level !== b.level) return b.level - a.level;
    return (a.profile?.username || "").localeCompare(b.profile?.username || "");
  });

  const filtered = q.trim()
    ? sorted.filter((m) =>
        m.profile?.username?.toLowerCase().includes(q.toLowerCase()) ||
        m.profile?.display_name?.toLowerCase().includes(q.toLowerCase()))
    : sorted;

  const statusDot = (status: string) => {
    switch (status) {
      case "online": return "bg-emerald-500";
      case "idle": return "bg-yellow-500";
      case "dnd": return "bg-red-500";
      default: return "bg-muted-foreground/30";
    }
  };

  return (
    <div className="w-56 md:w-60 border-l border-border bg-card/30 flex-col flex min-h-0">
      <div className="h-12 border-b border-border flex items-center px-3 gap-2 text-sm font-medium text-muted-foreground shrink-0">
        <Users className="h-4 w-4" /> Membros — {sorted.length}
      </div>
      <div className="p-2 pb-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar membro..."
            className="pl-7 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1 px-1.5">
        {filtered.length === 0 && q.trim() && (
          <p className="text-xs text-muted-foreground text-center py-6">Ninguém encontrado</p>
        )}

        {/* Online */}
        {(() => {
          const online = filtered.filter((m) => presence.get(m.user_id) === "online");
          if (!online.length) return null;
          return (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-emerald-500/80 font-semibold mb-1 px-1.5 flex items-center gap-1">
                <Circle className="h-2 w-2 fill-emerald-500" /> Online — {online.length}
              </p>
              {online.map((m) => <MemberRow key={m.user_id} member={m} status={presence.get(m.user_id) || "online"} />)}
            </div>
          );
        })()}

        {/* Idle */}
        {(() => {
          const idle = filtered.filter((m) => presence.get(m.user_id) === "idle");
          if (!idle.length) return null;
          return (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-yellow-500/80 font-semibold mb-1 px-1.5 flex items-center gap-1">
                <Circle className="h-2 w-2 fill-yellow-500" /> Ausente — {idle.length}
              </p>
              {idle.map((m) => <MemberRow key={m.user_id} member={m} status="idle" />)}
            </div>
          );
        })()}

        {/* DND */}
        {(() => {
          const dnd = filtered.filter((m) => presence.get(m.user_id) === "dnd");
          if (!dnd.length) return null;
          return (
            <div className="mb-2">
              <p className="text-[10px] uppercase tracking-wider text-red-500/80 font-semibold mb-1 px-1.5 flex items-center gap-1">
                <Circle className="h-2 w-2 fill-red-500" /> Ocupado — {dnd.length}
              </p>
              {dnd.map((m) => <MemberRow key={m.user_id} member={m} status="dnd" />)}
            </div>
          );
        })()}

        {/* Offline */}
        {(() => {
          const offline = filtered.filter((m) => !presence.has(m.user_id) || presence.get(m.user_id) === "offline");
          if (!offline.length) return null;
          return (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold mb-1 px-1.5">
                Offline — {offline.length}
              </p>
              {offline.map((m) => <MemberRow key={m.user_id} member={m} status="offline" />)}
            </div>
          );
        })()}
      </ScrollArea>
    </div>
  );
}

function MemberRow({ member, status }: { member: MemberWithProfile; status: string }) {
  const p = member.profile;
  const icon = member.level >= 100 ? <Crown className="h-3 w-3 text-yellow-500" />
    : member.level >= 80 ? <Shield className="h-3 w-3 text-blue-400" />
    : member.level >= 60 ? <Wrench className="h-3 w-3 text-green-400" />
    : null;

  const dotColor = status === "online" ? "bg-emerald-500"
    : status === "idle" ? "bg-yellow-500"
    : status === "dnd" ? "bg-red-500"
    : "bg-muted-foreground/30";

  return (
    <Link
      to="/app/profile/$userId"
      params={{ userId: member.user_id }}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40 transition-colors group"
    >
      <div className="relative shrink-0">
        <Avatar className="h-8 w-8 md:h-7 md:w-7">
          <AvatarImage src={p?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px]">{(p?.username || "?")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-2 border-card ${dotColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm truncate" style={p?.name_color ? { color: p.name_color } : undefined}>
            {p?.display_name || p?.username || "…"}
          </span>
          <span className="shrink-0">{icon}</span>
        </div>
        {p?.status_text && status !== "offline" && (
          <p className="text-[10px] text-muted-foreground/70 truncate leading-tight">{p.status_text}</p>
        )}
      </div>
    </Link>
  );
}
