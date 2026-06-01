import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LevelBadge } from "@/components/LevelBadge";
import { Search, Users, Shield, Crown, UserMinus, Check } from "lucide-react";
import { toast } from "sonner";

export function ServerMembersTab({
  server, serverId, canManage, canKick, members,
  kickMember, presence, isOwner,
}: {
  server: any; serverId: string; canManage: boolean; canKick: boolean;
  members: any[]; kickMember: (uid: string) => void;
  presence: Map<string, string>; isOwner: boolean;
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState("level");
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [memberRoleMap, setMemberRoleMap] = useState<Map<string, string[]>>(new Map());

  useEffect(() => {
    supabase.from("server_roles").select("*").eq("server_id", serverId).order("level", { ascending: false }).then(({ data }) => setAllRoles(data ?? []));
    supabase.from("server_member_roles").select("member_id, role_id, server_members!inner(user_id)").then(({ data }) => {
      const map = new Map<string, string[]>();
      (data ?? []).forEach((mr: any) => {
        const uid = mr.server_members?.user_id;
        if (!uid) return;
        const ids = map.get(uid) ?? [];
        ids.push(mr.role_id);
        map.set(uid, ids);
      });
      setMemberRoleMap(map);
    });
  }, [serverId]);

  const sortedMembers = [...members].sort((a, b) => {
    if (a.user_id === server?.owner_id) return -1;
    if (b.user_id === server?.owner_id) return 1;
    if (memberSort === "online") {
      const aOn = presence.get(a.user_id) != null && presence.get(a.user_id) !== "offline";
      const bOn = presence.get(b.user_id) != null && presence.get(b.user_id) !== "offline";
      if (aOn !== bOn) return aOn ? -1 : 1;
    }
    if (memberSort === "level" || memberSort === "online") return (b.level ?? 0) - (a.level ?? 0);
    const na = a.profiles?.display_name || a.profiles?.username || "";
    const nb = b.profiles?.display_name || b.profiles?.username || "";
    return na.localeCompare(nb);
  });

  const filteredMembers = sortedMembers.filter((m: any) => {
    if (!memberSearch) return true;
    const p = m.profiles;
    return p?.username?.toLowerCase().includes(memberSearch.toLowerCase()) ||
           p?.display_name?.toLowerCase().includes(memberSearch.toLowerCase());
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Buscar membros..." className="pl-8 h-9 text-sm" />
        </div>
        <select value={memberSort} onChange={(e) => setMemberSort(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
          <option value="level">Nivel</option>
          <option value="name">Nome</option>
          <option value="online">Online</option>
        </select>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-muted-foreground/60">
          <Users className="h-7 w-7 mb-2 opacity-40" />
          <p className="text-xs font-medium">{memberSearch ? "Ninguem encontrado" : "Nenhum membro"}</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] -mx-1 px-1">
          <div className="space-y-0.5">
            {filteredMembers.map((m: any) => {
              const p = m.profiles;
              const status = presence.get(m.user_id);
              const online = status != null && status !== "offline";
              return (
                <div key={m.user_id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/30 transition-colors group">
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8 ring-1 ring-border/30">
                      <AvatarImage src={p?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-px -right-px h-[9px] w-[9px] rounded-full border-[2px] border-card ${
                      online ? (status === "idle" ? "bg-yellow-500" : status === "dnd" ? "bg-red-500" : "bg-emerald-500") : "bg-muted-foreground/30"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <p className="text-sm font-medium truncate">{p?.display_name || p?.username}</p>
                      {m.user_id === server.owner_id && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
                      {(memberRoleMap.get(m.user_id) ?? []).map((rid) => {
                        const r = allRoles.find((rl: any) => rl.id === rid);
                        if (!r) return null;
                        return (
                          <span key={rid} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                            style={{ backgroundColor: r.color ? `${r.color}22` : undefined, color: r.color || undefined, border: `1px solid ${r.color ? `${r.color}44` : 'transparent'}` }}>
                            {r.gif_tag_url && <img src={r.gif_tag_url} alt="" className="h-2.5 w-2.5 rounded-sm object-cover" />}
                            {r.name}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <span>@{p?.username}</span>
                      <span className="text-muted-foreground/20">·</span>
                      <span>Nv.{m.level}</span>
                      {p?.status_text && <><span className="text-muted-foreground/20">·</span><span className="truncate italic max-w-[80px]">&ldquo;{p.status_text}&rdquo;</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canManage && m.user_id !== server.owner_id && allRoles.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-foreground hover:bg-accent/50">
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" side="left" className="w-52 p-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5 px-1">Atribuir cargos</p>
                          <div className="space-y-0.5 max-h-44 overflow-y-auto">
                            {allRoles.map((r: any) => {
                              const has = (memberRoleMap.get(m.user_id) ?? []).includes(r.id);
                              return (
                                <label key={r.id} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-accent cursor-pointer text-xs"
                                  onClick={async () => {
                                    if (has) {
                                      await supabase.from("server_member_roles").delete().eq("member_id", m.id).eq("role_id", r.id);
                                      const nm = new Map(memberRoleMap);
                                      nm.set(m.user_id, (nm.get(m.user_id) ?? []).filter((rid) => rid !== r.id));
                                      setMemberRoleMap(nm);
                                    } else {
                                      await supabase.from("server_member_roles").insert({ member_id: m.id, role_id: r.id });
                                      const nm = new Map(memberRoleMap);
                                      nm.set(m.user_id, [...(nm.get(m.user_id) ?? []), r.id]);
                                      setMemberRoleMap(nm);
                                    }
                                  }}>
                                  <div className={`h-3 w-3 rounded border flex items-center justify-center ${has ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
                                    {has && <Check className="h-2 w-2 text-primary-foreground" />}
                                  </div>
                                  {r.color && <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />}
                                  <span className="truncate">{r.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <LevelBadge xp={m.xp ?? 0} size="sm" />
                    {canKick && m.user_id !== server.owner_id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => kickMember(m.user_id)} title="Remover">
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
