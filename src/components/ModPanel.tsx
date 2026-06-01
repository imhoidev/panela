import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Gavel, AlertTriangle, Search, VolumeX, Volume2, ShieldCheck, Ban } from "lucide-react";

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

type ModMember = {
  id: string; user_id: string; level: number; xp: number;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function ModeracaoDialog({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"membros" | "banidos">("membros");
  const [members, setMembers] = useState<ModMember[]>([]);
  const [bans, setBans] = useState<any[]>([]);
  const [mutes, setMutes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [banning, setBanning] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState("");
  const [muting, setMuting] = useState<string | null>(null);
  const [muteReason, setMuteReason] = useState("");
  const [muteHours, setMuteHours] = useState("");

  async function loadMembers() {
    const { data: mems } = await supabase
      .from("server_members")
      .select("id, user_id, level, xp")
      .eq("server_id", serverId);
    if (!mems?.length) { setMembers([]); return; }
    const userIds = mems.map((m) => m.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds);
    const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    setMembers(mems.map((m) => ({ ...m, profiles: profMap[m.user_id] || null })));
  }

  async function loadBans() {
    const { data } = await supabase
      .from("server_bans")
      .select("id, user_id, reason, expires_at, created_at, banned_by")
      .eq("server_id", serverId);
    const list = data ?? [];
    if (list.length) {
      const userIds = list.map((b) => b.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      setBans(list.map((b) => ({ ...b, profiles: profMap[b.user_id] || null })));
    } else setBans([]);
  }

  async function loadMutes() {
    const { data } = await supabase
      .from("server_mutes")
      .select("id, user_id, reason, expires_at, created_at, muted_by")
      .eq("server_id", serverId);
    const list = data ?? [];
    if (list.length) {
      const userIds = list.map((m) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      setMutes(list.map((m) => ({ ...m, profiles: profMap[m.user_id] || null })));
    } else setMutes([]);
  }

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setBanReason("");
    setBanHours("");
    setBanning(null);
    setMuteReason("");
    setMuteHours("");
    setMuting(null);
    loadMembers();
    loadBans();
    loadMutes();
  }, [open, serverId]);

  async function banMember(userId: string) {
    if (banning) return;
    setBanning(userId);
    const expiresAt = banHours ? new Date(Date.now() + Number(banHours) * 3600000).toISOString() : null;
    const { error } = await supabase.from("server_bans").insert({
      server_id: serverId, user_id: userId, reason: banReason || null,
      banned_by: (await supabase.auth.getSession()).data.session?.user.id,
      expires_at: expiresAt,
    });
    setBanning(null);
    if (error) return toast.error(error.message);
    toast.success("Usuário banido");
    setBanReason(""); setBanHours(""); setBanning(null);
    loadBans();
  }

  async function unban(banId: string) {
    const { error } = await supabase.from("server_bans").delete().eq("id", banId);
    if (error) return toast.error(error.message);
    toast.success("Banimento removido");
    loadBans();
  }

  async function muteMember(userId: string) {
    if (muting) return;
    setMuting(userId);
    const expiresAt = muteHours ? new Date(Date.now() + Number(muteHours) * 3600000).toISOString() : null;
    const { error } = await supabase.from("server_mutes").insert({
      server_id: serverId, user_id: userId, reason: muteReason || null,
      muted_by: (await supabase.auth.getSession()).data.session?.user.id,
      expires_at: expiresAt,
    });
    setMuting(null);
    if (error) return toast.error(error.message);
    toast.success("Usuário silenciado");
    setMuteReason(""); setMuteHours(""); setMuting(null);
    loadMutes();
  }

  async function unmute(muteId: string) {
    const { error } = await supabase.from("server_mutes").delete().eq("id", muteId);
    if (error) return toast.error(error.message);
    toast.success("Silêncio removido");
    loadMutes();
  }

  const filtered = members.filter((m) => {
    if (!search) return true;
    const p = m.profiles;
    return p?.username?.toLowerCase().includes(search.toLowerCase()) ||
           p?.display_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}
      title="Moderação"
      trigger={<Button variant="ghost" size="sm" disabled={!canManage} className="text-destructive"><Gavel className="h-4 w-4 mr-1" />Mod.</Button>}>
      <div className="space-y-3 min-h-[300px]">
        <div className="flex gap-1">
          <button onClick={() => setTab("membros")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "membros" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Membros
          </button>
          <button onClick={() => setTab("banidos")}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "banidos" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Banidos
          </button>
        </div>

        {tab === "membros" && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar membros..." className="pl-8 h-9 text-sm" />
            </div>
            <ScrollArea className="h-[300px] -mx-1 px-1">
              <div className="space-y-0.5">
                {filtered.map((m) => {
                  const p = m.profiles;
                  const isBanned = bans.some((b) => b.user_id === m.user_id);
                  const isMuted = mutes.some((mu) => mu.user_id === m.user_id);
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
                            onClick={() => { const mu = mutes.find((x) => x.user_id === m.user_id); if (mu) unmute(mu.id); }}
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
                              <Button onClick={() => muteMember(m.user_id)} disabled={muting === m.user_id}
                                variant="destructive" className="w-full h-9 text-xs">
                                {muting === m.user_id ? "Silenciando..." : "Silenciar"}
                              </Button>
                            </div>
                          </ResponsiveDialog>
                        )}
                        {isBanned ? (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => { const b = bans.find((x) => x.user_id === m.user_id); if (b) unban(b.id); }}
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
                              <Button onClick={() => banMember(m.user_id)} disabled={banning === m.user_id}
                                variant="destructive" className="w-full h-9 text-xs">
                                {banning === m.user_id ? "Banindo..." : "Banir"}
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
          </div>
        )}

        {tab === "banidos" && (
          <div className="space-y-2">
            {bans.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-8">Nenhum membro banido.</p>
            ) : (
              <ScrollArea className="h-[300px] -mx-1 px-1">
                <div className="space-y-0.5">
                  {bans.map((b) => {
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
                          onClick={() => unban(b.id)} title="Desbanir">
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
      </div>
    </ResponsiveDialog>
  );
}