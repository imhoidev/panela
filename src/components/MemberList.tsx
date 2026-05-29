import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Crown, Shield, Wrench } from "lucide-react";

type MemberWithProfile = {
  user_id: string;
  level: number;
  profile: { username: string; display_name: string | null; avatar_url: string | null; name_color: string | null } | null;
};

export function MemberList({ serverId, onlineUsers }: { serverId: string; onlineUsers: Set<string> }) {
  const [members, setMembers] = useState<MemberWithProfile[]>([]);

  useEffect(() => {
    if (!serverId) return;
    supabase.from("server_members").select("user_id, level").eq("server_id", serverId).then(async ({ data }) => {
      if (!data?.length) return;
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url, name_color").in("id", userIds);
      const profMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      setMembers(data.map((m) => ({ user_id: m.user_id, level: m.level, profile: profMap[m.user_id] || null })));
    });
  }, [serverId]);

  const sorted = [...members].sort((a, b) => {
    if (a.level !== b.level) return b.level - a.level;
    return (a.profile?.username || "").localeCompare(b.profile?.username || "");
  });

  const online = sorted.filter((m) => onlineUsers.has(m.user_id));
  const offline = sorted.filter((m) => !onlineUsers.has(m.user_id));

  return (
    <div className="w-56 border-l border-border bg-card/30 flex flex-col">
      <div className="h-12 border-b border-border flex items-center px-3 gap-2 text-sm font-medium text-muted-foreground">
        <Users className="h-4 w-4" /> Membros — {sorted.length}
      </div>
      <ScrollArea className="flex-1 p-2">
        {online.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 px-1">Online — {online.length}</p>
            {online.map((m) => <MemberRow key={m.user_id} member={m} online />)}
          </div>
        )}
        {offline.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1 px-1">Offline — {offline.length}</p>
            {offline.map((m) => <MemberRow key={m.user_id} member={m} online={false} />)}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function MemberRow({ member, online }: { member: MemberWithProfile; online: boolean }) {
  const p = member.profile;
  const icon = member.level >= 100 ? <Crown className="h-3 w-3 text-yellow-500" />
    : member.level >= 80 ? <Shield className="h-3 w-3 text-blue-400" />
    : member.level >= 60 ? <Wrench className="h-3 w-3 text-green-400" />
    : null;

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40 transition-colors">
      <div className="relative shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarImage src={p?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[10px]">{(p?.username || "?")[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
      </div>
      <span className="text-sm truncate" style={p?.name_color ? { color: p.name_color } : undefined}>
        {p?.display_name || p?.username || "…"}
      </span>
      {icon}
    </div>
  );
}
