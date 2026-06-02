import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Label } from "@/components/ui/label";
import { LevelBadge } from "@/components/LevelBadge";
import {
  useServerRoles, useMemberRoleMap, useKickMember, useBanMember, useMuteMember,
  useServerBans, useServerMutes, useAssignRole, useRemoveRole, useUnbanMember, useUnmuteMember,
  useUpdateMemberLevel,
} from "@/hooks/servers";
import { Search, Users, Shield, Crown, UserMinus, Check, Ban, VolumeX } from "lucide-react";

function formatRelativeDate(value: string | null) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ServerMembersTab({
  server, serverId, canManage, canKick, members,
  kickMember, presence, isOwner,
}: {
  server: any; serverId: string; canManage: boolean; canKick: boolean;
  members: any[]; kickMember?: (uid: string) => void;
  presence: Map<string, string>; isOwner: boolean;
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState("level");
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [muteHours, setMuteHours] = useState("");

  const { data: allRoles = [], isLoading: rolesLoading } = useServerRoles(serverId);
  const { data: memberRoleMap = new Map<string, string[]>(), isLoading: rolesMapLoading } = useMemberRoleMap(serverId);
  const { data: bans = [] } = useServerBans(serverId);
  const { data: mutes = [] } = useServerMutes(serverId);

  const kickMutation = useKickMember(serverId);
  const banMutation = useBanMember(serverId);
  const muteMutation = useMuteMember(serverId);
  const unbanMutation = useUnbanMember(serverId);
  const unmuteMutation = useUnmuteMember(serverId);
  const assignRole = useAssignRole(serverId);
  const removeRole = useRemoveRole(serverId);
  const updateLevel = useUpdateMemberLevel(serverId);

  if (rolesLoading || rolesMapLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full rounded-lg" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

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

  const handleKick = (userId: string) => {
    if (kickMember) return kickMember(userId);
    kickMutation.mutate(userId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Buscar membros..." className="pl-8 h-9 text-sm" />
        </div>
        <Select value={memberSort} onValueChange={setMemberSort}>
          <SelectTrigger className="w-[120px] h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="level">Nível</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-muted-foreground/60">
          <Users className="h-7 w-7 mb-2 opacity-40" />
          <p className="text-xs font-medium">{memberSearch ? "Ninguém encontrado" : "Nenhum membro"}</p>
        </div>
      ) : (
        <ScrollArea className="h-[340px] -mx-1 px-1">
          <div className="space-y-3">
            {filteredMembers.map((m: any) => {
              const p = m.profiles;
              const status = presence.get(m.user_id);
              const online = status != null && status !== "offline";
              const assignedRoles = memberRoleMap.get(m.user_id) ?? [];

              return (
                <div key={m.user_id} className="rounded-2xl border border-border bg-card p-3">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10 ring-1 ring-border/25">
                          <AvatarImage src={p?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-px -right-px h-[10px] w-[10px] rounded-full border-[2px] border-card ${online ? (status === "idle" ? "bg-yellow-500" : status === "dnd" ? "bg-red-500" : "bg-emerald-500") : "bg-muted-foreground/30"}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold truncate">{p?.display_name || p?.username}</p>
                          {m.user_id === server.owner_id && <Crown className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/70">
                          <span>{online ? "Online" : "Offline"}</span>
                          <span>·</span>
                          <span>Nv. {m.level}</span>
                          {p?.status_text && <><span>·</span><span className="truncate italic max-w-[160px]">"{p.status_text}"</span></>}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {assignedRoles.map((rid) => {
                            const role = allRoles.find((rl: any) => rl.id === rid);
                            if (!role) return null;
                            return (
                              <span key={rid} className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium"
                                style={{ backgroundColor: role.color ? `${role.color}18` : undefined, color: role.color || undefined, borderColor: role.color ? `${role.color}55` : undefined }}>
                                {role.name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:items-end md:justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        {canManage && m.user_id !== server.owner_id && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground/40 hover:text-foreground hover:bg-accent/50">
                                <Shield className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" side="left" className="w-56 p-2">
                              <p className="text-xs font-semibold text-muted-foreground mb-2">Atribuir cargos</p>
                              <div className="space-y-1 max-h-52 overflow-y-auto">
                                {allRoles.length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground/70">Crie cargos na aba Cargos para usá-los aqui.</p>
                                ) : allRoles.map((role: any) => {
                                  const has = assignedRoles.includes(role.id);
                                  return (
                                    <button key={role.id} type="button"
                                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-accent/60"
                                      onClick={() => {
                                        if (has) removeRole.mutate({ memberId: m.id, roleId: role.id });
                                        else assignRole.mutate({ memberId: m.id, roleId: role.id });
                                      }}>
                                      <span className={`h-3 w-3 rounded-full ${has ? "bg-primary" : "border border-muted-foreground/30"}`} />
                                      <span className="truncate">{role.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                        {canManage && m.user_id !== server.owner_id && (
                          <Select value={String(m.level)} onValueChange={(value) => updateLevel.mutate({ userId: m.user_id, level: Number(value) })}>
                            <SelectTrigger className="h-9 min-w-[130px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Membro</SelectItem>
                              <SelectItem value="60">Moderador</SelectItem>
                              <SelectItem value="80">Gerente</SelectItem>
                              <SelectItem value="99">Proprietário</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canManage && m.user_id !== server.owner_id && (
                          <>
                            <ResponsiveDialog title="Silenciar membro"
                              trigger={<Button variant="outline" size="sm" className="h-9 text-xs"><VolumeX className="h-3.5 w-3.5" /> Silenciar</Button>}>
                              <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">Silenciar <strong>{p?.display_name || p?.username}</strong></p>
                                <div className="space-y-1"><Label className="text-xs">Motivo</Label>
                                  <Input value={muteReason} onChange={(e) => setMuteReason(e.target.value)} className="h-9 text-sm" placeholder="Opcional" /></div>
                                <div className="space-y-1"><Label className="text-xs">Duração (horas)</Label>
                                  <Input value={muteHours} onChange={(e) => setMuteHours(e.target.value)} className="h-9 text-sm" placeholder="Permanente se vazio" /></div>
                                <Button onClick={() => { muteMutation.mutate({ userId: m.user_id, reason: muteReason, hours: muteHours }); setMuteReason(""); setMuteHours(""); }}
                                  variant="destructive" className="w-full h-9 text-xs">Silenciar</Button>
                              </div>
                            </ResponsiveDialog>
                            <ResponsiveDialog title="Banir membro"
                              trigger={<Button variant="destructive" size="sm" className="h-9 text-xs"><Ban className="h-3.5 w-3.5" /> Banir</Button>}>
                              <div className="space-y-3">
                                <p className="text-xs text-muted-foreground">Banir <strong>{p?.display_name || p?.username}</strong></p>
                                <div className="space-y-1"><Label className="text-xs">Motivo</Label>
                                  <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} className="h-9 text-sm" placeholder="Opcional" /></div>
                                <div className="space-y-1"><Label className="text-xs">Duração (horas)</Label>
                                  <Input value={banHours} onChange={(e) => setBanHours(e.target.value)} className="h-9 text-sm" placeholder="Permanente se vazio" /></div>
                                <Button onClick={() => { banMutation.mutate({ userId: m.user_id, reason: banReason, hours: banHours }); setBanReason(""); setBanHours(""); }}
                                  variant="destructive" className="w-full h-9 text-xs">Banir</Button>
                              </div>
                            </ResponsiveDialog>
                          </>
                        )}
                        {canKick && m.user_id !== server.owner_id && (
                          <Button variant="outline" size="sm" className="h-9 text-xs text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => { if (confirm("Remover este membro?")) handleKick(m.user_id); }}>Remover</Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {canManage && (
        <div className="grid gap-3 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Banimentos ativos</h4>
                <p className="text-[11px] text-muted-foreground/70">Gerencie quem está banido do servidor</p>
              </div>
            </div>
            {bans.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">Sem banimentos ativos.</p>
            ) : (
              <div className="space-y-2">
                {bans.map((ban: any) => (
                  <div key={ban.id} className="rounded-xl border border-border p-3 bg-muted/30 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{ban.profiles?.display_name || ban.profiles?.username || "Usuário"}</p>
                      <p className="text-[11px] text-muted-foreground/70">{ban.reason || "Sem motivo"}</p>
                      <p className="text-[10px] text-muted-foreground/60">Expira: {ban.expires_at ? formatRelativeDate(ban.expires_at) : "Permanente"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => unbanMutation.mutate(ban.id)}>Desbanir</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Silenciamentos</h4>
                <p className="text-[11px] text-muted-foreground/70">Veja e remova silenciamentos ativos</p>
              </div>
            </div>
            {mutes.length === 0 ? (
              <p className="text-xs text-muted-foreground/60">Sem silenciamentos ativos.</p>
            ) : (
              <div className="space-y-2">
                {mutes.map((mute: any) => (
                  <div key={mute.id} className="rounded-xl border border-border p-3 bg-muted/30 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{mute.profiles?.display_name || mute.profiles?.username || "Usuário"}</p>
                      <p className="text-[11px] text-muted-foreground/70">{mute.reason || "Sem motivo"}</p>
                      <p className="text-[10px] text-muted-foreground/60">Expira: {mute.expires_at ? formatRelativeDate(mute.expires_at) : "Permanente"}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => unmuteMutation.mutate(mute.id)}>Remover silêncio</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
