import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Gavel, AlertTriangle, Search, VolumeX, Volume2, ShieldCheck, Ban } from "lucide-react";
import { useServerMembers, useServerBans, useServerMutes, useBanMember, useUnbanMember, useMuteMember, useUnmuteMember, useServerAuditLogs } from "@/hooks/servers";
import { FileText } from "lucide-react";

export function ReportDialog({ messageId, channelId }: { messageId: string; channelId?: string }) {
  const [reason, setReason] = useState("spam");
  const [open, setOpen] = useState(false);

  async function report() {
    const { error } = await supabase.from("moderation_reports").insert({
      message_id: messageId, channel_id: channelId, reason, reported_by: (await supabase.auth.getSession()).data.session?.user.id,
    });
    if (error) toast.error(error.message); else { toast.success("Reportado à moderação"); setOpen(false); }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}
      title="Reportar mensagem"
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </Button>
      }>
      <div className="space-y-3">
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="harassment">Assédio</SelectItem>
            <SelectItem value="hate">Discurso de ódio</SelectItem>
            <SelectItem value="nsfw">Conteúdo impróprio</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={report} className="w-full h-10">Enviar report</Button>
      </div>
    </ResponsiveDialog>
  );
}

export function ModeracaoDialog({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"membros" | "banidos" | "logs">("membros");
  const [search, setSearch] = useState("");

  const { data: members = [], isLoading: membersLoading } = useServerMembers(serverId);
  const { data: bans = [], isLoading: bansLoading } = useServerBans(serverId);
  const { data: mutes = [], isLoading: mutesLoading } = useServerMutes(serverId);
  const { data: auditLogs = [], isLoading: logsLoading } = useServerAuditLogs(serverId);

  const banMutation = useBanMember(serverId);
  const unbanMutation = useUnbanMember(serverId);
  const muteMutation = useMuteMember(serverId);
  const unmuteMutation = useUnmuteMember(serverId);

  const [muteTarget, setMuteTarget] = useState<string | null>(null);
  const [muteReason, setMuteReason] = useState("");
  const [muteHours, setMuteHours] = useState("");
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch(""); setBanReason(""); setBanHours(""); setBanTarget(null);
    setMuteReason(""); setMuteHours(""); setMuteTarget(null);
  }, [open]);

  const filtered = members.filter((m: any) => {
    if (!search) return true;
    const p = m.profiles;
    return p?.username?.toLowerCase().includes(search.toLowerCase()) ||
           p?.display_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}
      title="Moderação & Auditoria"
      trigger={<Button variant="ghost" size="sm" disabled={!canManage} className="text-destructive"><Gavel className="h-4 w-4 mr-1" />Mod.</Button>}>
      <div className="space-y-3 min-h-[340px]">
        <div className="flex gap-1 bg-muted/20 p-1 rounded-lg">
          <button onClick={() => setTab("membros")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "membros" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Membros
          </button>
          <button onClick={() => setTab("banidos")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "banidos" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Banidos ({bans.length})
          </button>
          <button onClick={() => setTab("logs")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "logs" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Logs de Auditoria
          </button>
        </div>

        {tab === "membros" && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar membros..." className="pl-8 h-9 text-sm" />
            </div>
            {membersLoading ? (
              <div className="space-y-1">{[1,2,3].map((i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}</div>
            ) : (
              <ScrollArea className="h-[300px] -mx-1 px-1">
                <div className="space-y-0.5">
                  {filtered.map((m: any) => {
                    const p = m.profiles;
                    const isBanned = bans.some((b: any) => b.user_id === m.user_id);
                    const isMuted = mutes.some((mu: any) => mu.user_id === m.user_id);
                    return (
                      <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors group">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={p?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px]">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p?.display_name || p?.username}</p>
                          <p className="text-[10px] text-muted-foreground/60">Nv.{m.level}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isMuted ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-500"
                              onClick={() => { const mu = mutes.find((x: any) => x.user_id === m.user_id); if (mu) unmuteMutation.mutate(mu.id); }}
                              title="Remover silêncio">
                              <Volume2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <ResponsiveDialog title="Silenciar membro"
                              trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-amber-500"
                                title="Silenciar"><VolumeX className="h-3.5 w-3.5" /></Button>}>
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Silenciar <strong>{p?.display_name || p?.username}</strong></p>
                                <div className="space-y-1"><Label className="text-xs">Motivo</Label>
                                  <Input value={muteReason} onChange={(e) => setMuteReason(e.target.value)} className="h-9 text-sm" placeholder="Opcional" /></div>
                                <div className="space-y-1"><Label className="text-xs">Duração (horas)</Label>
                                  <Input value={muteHours} onChange={(e) => setMuteHours(e.target.value)} className="h-9 text-sm" placeholder="Permanente se vazio" /></div>
                                <Button onClick={() => { muteMutation.mutate({ userId: m.user_id, reason: muteReason, hours: muteHours }); setMuteTarget(null); setMuteReason(""); setMuteHours(""); }}
                                  variant="destructive" className="w-full h-9 text-xs">
                                  Silenciar
                                </Button>
                              </div>
                            </ResponsiveDialog>
                          )}
                          {isBanned ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => { const b = bans.find((x: any) => x.user_id === m.user_id); if (b) unbanMutation.mutate(b.id); }}
                              title="Remover banimento">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <ResponsiveDialog title="Banir membro"
                              trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-destructive"
                                title="Banir"><Ban className="h-3.5 w-3.5" /></Button>}>
                              <div className="space-y-2">
                                <p className="text-xs text-muted-foreground">Banir <strong>{p?.display_name || p?.username}</strong></p>
                                <div className="space-y-1"><Label className="text-xs">Motivo</Label>
                                  <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} className="h-9 text-sm" placeholder="Opcional" /></div>
                                <div className="space-y-1"><Label className="text-xs">Duração (horas)</Label>
                                  <Input value={banHours} onChange={(e) => setBanHours(e.target.value)} className="h-9 text-sm" placeholder="Permanente se vazio" /></div>
                                <Button onClick={() => { banMutation.mutate({ userId: m.user_id, reason: banReason, hours: banHours }); setBanTarget(null); setBanReason(""); setBanHours(""); }}
                                  variant="destructive" className="w-full h-9 text-xs">
                                  Banir
                                </Button>
                              </div>
                            </ResponsiveDialog>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {tab === "banidos" && (
          <div className="space-y-2">
            {bansLoading ? (
              <div className="space-y-1">{[1,2].map((i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}</div>
            ) : bans.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-8">Nenhum membro banido.</p>
            ) : (
              <ScrollArea className="h-[300px] -mx-1 px-1">
                <div className="space-y-0.5">
                  {bans.map((b: any) => {
                    const p = b.profiles;
                    return (
                      <div key={b.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors group">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={p?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px]">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p?.display_name || p?.username}</p>
                          <p className="text-[10px] text-muted-foreground/60">
                            {b.reason || "Sem motivo"}
                            {b.expires_at && <> · Expira {new Date(b.expires_at).toLocaleDateString("pt-BR")}</>}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/40 hover:text-emerald-500"
                          onClick={() => unbanMutation.mutate(b.id)} title="Desbanir">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        {tab === "logs" && (
          <div className="space-y-2">
            {logsLoading ? (
              <div className="space-y-1">{[1,2,3].map((i) => <Skeleton key={i} className="h-11 w-full rounded-lg" />)}</div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground/50">
                <FileText className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Nenhum evento registrado ainda.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] -mx-1 px-1">
                <div className="space-y-1.5">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-2.5 rounded-lg border border-border/50 bg-card/40 text-xs space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-semibold text-primary/80 uppercase tracking-wider text-[10px]">{log.action}</span>
                        <span className="text-[10px]">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground/80">
                        <span>Mod: <strong>{log.mod_profile?.display_name || log.mod_profile?.username || "Sistema"}</strong></span>
                        {log.target_profile && (
                          <span>→ Alvo: <strong>{log.target_profile?.display_name || log.target_profile?.username}</strong></span>
                        )}
                      </div>
                      {log.reason && (
                        <p className="text-[11px] text-muted-foreground/70 italic">"{log.reason}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </ResponsiveDialog>
  );
}
