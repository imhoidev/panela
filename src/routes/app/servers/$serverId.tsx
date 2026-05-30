import { createFileRoute, Outlet, Link, useParams, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberList } from "@/components/MemberList";
import { ServerRolesDialog } from "@/components/ServerRoles";
import { ServerEventsDialog } from "@/components/ServerEvents";
import { InvitesDialog } from "@/components/Invites";
import { ThemeDialog } from "@/components/ThemeConfig";
import { BanDialog } from "@/components/ModPanel";
import { LevelBadge } from "@/components/LevelBadge";
import { StatusDot } from "@/components/PresenceStatus";
import { getSocket } from "@/lib/socket";
import {
  Hash, Plus, Settings, LogOut, Volume2, Menu, Users, Copy, AtSign, Check, Shield,
  ChevronDown, ChevronRight, Search, MessageSquare, X, Crown, UserMinus,
  Edit3, Link2, Trash2, Globe, Lock, Bell, BellOff, Pin,
} from "lucide-react";
import { toast } from "sonner";
import { slugify, isValidSlug } from "@/lib/slug";

export const Route = createFileRoute("/app/servers/$serverId")({
  component: ServerLayout,
});

function ServerLayout() {
  const { serverId } = useParams({ from: "/app/servers/$serverId" });
  const { user } = useAuth();
  const router = useRouter();
  const loc = useLocation();
  const [server, setServer] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [memberLevel, setMemberLevel] = useState(0);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"text" | "voice" | "announcement">("text");
  const [newCategory, setNewCategory] = useState("");
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [presence, setPresence] = useState<Map<string, string>>(new Map());
  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const s = getSocket(user.id);
    const onUsers = (users: { userId: string; status: string }[]) => {
      const m = new Map<string, string>();
      users.forEach((u) => m.set(u.userId, u.status || "online"));
      setPresence(m);
    };
    s.on("presence:users", onUsers);
    s.on("connect", () => s.emit("presence:join", { userId: user.id, serverId }));
    return () => { s.off("presence:users"); s.off("connect"); s.disconnect(); };
  }, [user?.id, serverId]);

  async function load() {
    if (!user) return;
    const [{ data: s }, { data: ch }, { data: mem }] = await Promise.all([
      supabase.from("servers").select("*").eq("id", serverId).maybeSingle(),
      supabase.from("channels").select("*").eq("server_id", serverId).order("position"),
      supabase.from("server_members").select("level").eq("server_id", serverId).eq("user_id", user.id).maybeSingle(),
    ]);
    setServer(s); setChannels(ch ?? []); setMemberLevel(mem?.level ?? 0);
    if (s && ch && ch.length > 0 && loc.pathname === `/app/servers/${serverId}`) {
      const first = ch.find((c: any) => c.type === "text") ?? ch[0];
      router.navigate({ to: "/app/servers/$serverId/$channelId", params: { serverId, channelId: first.id }, replace: true });
    }
  }

  async function loadMembers() {
    const { data } = await supabase
      .from("server_members")
      .select("user_id, level, xp, profiles!inner(username,display_name,avatar_url)")
      .eq("server_id", serverId);
    setMembers(data ?? []);
  }

  useEffect(() => { load(); }, [serverId, user?.id]);
  useEffect(() => { if (settingsOpen) loadMembers(); }, [settingsOpen]);

  useEffect(() => {
    const ch = supabase.channel(`server-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [serverId]);

  useEffect(() => { setMobileChannelsOpen(false); }, [loc.pathname]);

  async function addChannel() {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32);
    const { error } = await supabase.from("channels").insert({
      server_id: serverId, name: slug, type: newType, position: channels.length,
      category: newCategory.trim() || null,
    });
    if (error) return toast.error(error.message);
    setOpen(false); setNewName(""); setNewCategory("");
  }

  async function deleteChannel(channelId: string) {
    if (!confirm("Deletar este canal permanentemente?")) return;
    const { error } = await supabase.from("channels").delete().eq("id", channelId);
    if (error) toast.error(error.message);
  }

  async function leave() {
    if (!user) return;
    if (!confirm("Sair desta panela?")) return;
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", user.id);
    router.navigate({ to: "/app/servers" });
  }

  async function kickMember(targetUserId: string) {
    if (!confirm("Remover este membro?")) return;
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", targetUserId);
    toast.success("Membro removido");
    loadMembers();
  }

  if (!server) return <div className="p-8 text-muted-foreground">Carregando servidor…</div>;
  const canManage = memberLevel >= 80;
  const isOwner = server.owner_id === user?.id;
  const canKick = memberLevel >= 60;

  const categories = new Map<string, any[]>();
  const uncategorized: any[] = [];
  channels.forEach((c) => {
    if (c.category) { const arr = categories.get(c.category) ?? []; arr.push(c); categories.set(c.category, arr); }
    else { uncategorized.push(c); }
  });

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <ServerHeader server={server} serverId={serverId} isOwner={isOwner} onSlugChanged={load} />
        <ChannelsList
          categories={categories} uncategorized={uncategorized} collapsedCats={collapsedCats} toggleCat={toggleCat}
          channels={channels}
          serverId={serverId} loc={loc} canManage={canManage}
          open={open} setOpen={setOpen} newName={newName} setNewName={setNewName}
          newType={newType} setNewType={setNewType} newCategory={newCategory} setNewCategory={setNewCategory}
          addChannel={addChannel} deleteChannel={deleteChannel}
        />
        <ServerToolbar
          canManage={canManage} isOwner={isOwner} serverId={serverId} server={server}
          leave={leave} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
          toolsOpen={toolsOpen} setToolsOpen={setToolsOpen}
        />
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-2 h-11 border-b border-border bg-sidebar/80 shrink-0">
          <Sheet open={mobileChannelsOpen} onOpenChange={setMobileChannelsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5"><Menu className="h-4 w-4" />Canais</Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px] bg-sidebar flex flex-col">
              <SheetHeader className="sr-only"><SheetTitle>Canais</SheetTitle><SheetDescription>Lista de canais e ações.</SheetDescription></SheetHeader>
              <ServerHeader server={server} serverId={serverId} isOwner={isOwner} onSlugChanged={load} />
              <ChannelsList
                categories={categories} uncategorized={uncategorized} collapsedCats={collapsedCats} toggleCat={toggleCat}
                channels={channels}
                serverId={serverId} loc={loc} canManage={canManage}
                open={open} setOpen={setOpen} newName={newName} setNewName={setNewName}
                newType={newType} setNewType={setNewType} newCategory={newCategory} setNewCategory={setNewCategory}
                addChannel={addChannel} deleteChannel={deleteChannel}
              />
              <ServerToolbar
                canManage={canManage} isOwner={isOwner} serverId={serverId} server={server}
                leave={leave} settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
                toolsOpen={toolsOpen} setToolsOpen={setToolsOpen}
              />
            </SheetContent>
          </Sheet>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />{server.member_count}
          </div>
          <div className="ml-auto flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)} title="Configurações">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <Outlet />
          {memberLevel > 0 && (
            <div className="hidden lg:block">
              <MemberList serverId={serverId} presence={presence} />
            </div>
          )}
        </div>
      </div>

      <ResponsiveDialog open={settingsOpen} onOpenChange={setSettingsOpen}
        title="Configurações do servidor"
        className="max-h-[90dvh] overflow-hidden"
        contentClassName="h-full overflow-hidden p-0">
        <ServerSettingsPanel
          server={server} serverId={serverId} isOwner={isOwner} canManage={canManage} canKick={canKick}
          members={members} memberSearch={memberSearch} setMemberSearch={setMemberSearch}
          kickMember={kickMember} presence={presence} onServerUpdate={(s: any) => setServer(s)}
        />
      </ResponsiveDialog>
    </div>
  );
}

/* ─── Server Header ─── */
function ServerHeader({ server, serverId, isOwner, onSlugChanged }: any) {
  return (
    <div className="p-4 border-b border-sidebar-border space-y-2">
      <div className="flex items-center gap-3">
        {server.icon_url ? (
          <img src={server.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-sidebar-border" />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-sidebar-border grid place-items-center font-bold text-primary text-sm">
            {server.name[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold truncate text-sm leading-tight">{server.name}</h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {server.privacy === "private" ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
              {server.member_count}
            </span>
          </div>
        </div>
      </div>
      <SlugTag slug={server.slug} canEdit={isOwner} serverId={serverId} onSaved={onSlugChanged} />
    </div>
  );
}

/* ─── Channels List ─── */
function ChannelsList({
  categories, uncategorized, collapsedCats, toggleCat, channels,
  serverId, loc, canManage, open, setOpen, newName, setNewName,
  newType, setNewType, newCategory, setNewCategory, addChannel, deleteChannel,
}: any) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-1">
        {/* Section header */}
        <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          <span className="font-semibold">Canais</span>
          {canManage && (
            <ResponsiveDialog open={open} onOpenChange={setOpen}
              title="Novo canal"
              trigger={<button className="hover:text-foreground p-0.5 transition-colors" title="Criar canal"><Plus className="h-3.5 w-3.5" /></button>}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Tipo</Label>
                  <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="voice">Voz</SelectItem>
                      <SelectItem value="announcement">Anúncios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="nome-do-canal" className="h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria (opcional)</Label>
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="ex: Geral, Voz, Jogos" className="h-10" />
                </div>
                <Button onClick={addChannel} className="w-full h-10">Criar</Button>
              </div>
            </ResponsiveDialog>
          )}
        </div>

        {/* Uncategorized channels (shown first) */}
        {uncategorized.map((c: any) => (
          <ChannelItem key={c.id} c={c} serverId={serverId} loc={loc} canManage={canManage} deleteChannel={deleteChannel} />
        ))}

        {/* Categorized channels */}
        {[...categories.entries()].map(([cat, chs]) => (
          <div key={cat}>
            <button
              onClick={() => toggleCat(cat)}
              className="flex items-center gap-1 w-full px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground/80 transition-colors rounded"
            >
              {collapsedCats.has(cat) ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="font-semibold">{cat}</span>
              <span className="ml-auto text-[9px] opacity-50">{chs.length}</span>
            </button>
            {!collapsedCats.has(cat) && chs.map((c: any) => (
              <ChannelItem key={c.id} c={c} serverId={serverId} loc={loc} canManage={canManage} deleteChannel={deleteChannel} />
            ))}
          </div>
        ))}

        {channels.length === 0 && (
          <p className="text-[11px] text-muted-foreground/50 text-center py-6">Nenhum canal ainda</p>
        )}
      </div>
    </ScrollArea>
  );
}

/* ─── Channel Item ─── */
function ChannelItem({ c, serverId, loc, canManage, deleteChannel }: any) {
  const path = `/app/servers/${serverId}/${c.id}`;
  const active = loc.pathname === path;
  const Icon = c.type === "voice" ? Volume2 : c.type === "announcement" ? MessageSquare : Hash;
  const iconColor = c.type === "voice" ? "text-emerald-500" : c.type === "announcement" ? "text-amber-500" : "text-primary/70";
  return (
    <div className="group flex items-center rounded-md">
      <Link
        to="/app/servers/$serverId/$channelId"
        params={{ serverId, channelId: c.id }}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm flex-1 min-w-0 transition-all ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
            : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
        <span className="truncate text-[13px]">{c.name}</span>
      </Link>
      {canManage && (
        <button
          onClick={() => deleteChannel(c.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/50 hover:text-destructive shrink-0 transition-opacity"
          title="Deletar canal"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ─── Server Toolbar ─── */
function ServerToolbar({ canManage, isOwner, serverId, server, leave, settingsOpen, setSettingsOpen, toolsOpen, setToolsOpen }: any) {
  return (
    <div className="border-t border-sidebar-border bg-sidebar/80">
      {/* Collapsible tools row */}
      {toolsOpen && (
        <div className="p-2 flex flex-wrap gap-1 border-b border-sidebar-border">
          <ServerRolesDialog serverId={serverId} canManage={canManage} />
          <ServerEventsDialog serverId={serverId} canManage={canManage} />
          <InvitesDialog serverId={serverId} canManage={canManage} />
          <ThemeDialog serverId={serverId} server={server} canManage={canManage} />
          <BanDialog serverId={serverId} canManage={canManage} />
        </div>
      )}
      {/* Bottom action row */}
      <div className="p-1.5 flex items-center gap-0.5">
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 px-2 text-muted-foreground/70 hover:text-foreground"
          onClick={() => setSettingsOpen(true)}>
          <Settings className="h-3.5 w-3.5" /> Ajustes
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 px-2 text-muted-foreground/70 hover:text-foreground"
          onClick={() => setToolsOpen(!toolsOpen)}>
          <Shield className="h-3.5 w-3.5" /> Ferram.
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 px-2 text-destructive/70 hover:text-destructive ml-auto"
          onClick={leave} title="Sair do servidor">
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

/* ─── Slug Tag ─── */
function SlugTag({ slug, canEdit, serverId, onSaved }: { slug: string | null; canEdit: boolean; serverId: string; onSaved: () => void }) {
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [val, setVal] = useState(slug ?? "");
  const [saving, setSaving] = useState(false);

  async function copy() {
    if (!slug) return;
    const url = `${window.location.origin}/app/s/${slug}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); toast.success("Link copiado!"); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("Não consegui copiar"); }
  }

  async function save() {
    const s = slugify(val);
    if (!isValidSlug(s)) return toast.error("Slug inválido (2-32 chars, a-z, 0-9, -).");
    setSaving(true);
    const { error } = await supabase.from("servers").update({ slug: s }).eq("id", serverId);
    setSaving(false);
    if (error) {
      if ((error as any).code === "23505" || /slug_taken/.test(error.message)) return toast.error("Esse slug já está em uso.");
      return toast.error(error.message);
    }
    toast.success("Slug atualizado!");
    setEditOpen(false); onSaved();
  }

  if (!slug) return null;
  return (
    <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60">
      <AtSign className="h-2.5 w-2.5 shrink-0" />
      <span className="truncate font-mono">{slug}</span>
      <button onClick={copy} className="p-0.5 rounded hover:bg-sidebar-accent/60 text-muted-foreground/50 hover:text-foreground transition-colors" title="Copiar link">
        {copied ? <Check className="h-2.5 w-2.5 text-primary" /> : <Copy className="h-2.5 w-2.5" />}
      </button>
      {canEdit && (
        <ResponsiveDialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (o) setVal(slug); }}
          title="Editar slug"
          trigger={
            <button className="p-0.5 rounded hover:bg-sidebar-accent/60 text-muted-foreground/50 hover:text-foreground transition-colors" title="Editar slug">
              <Edit3 className="h-2.5 w-2.5" />
            </button>
          }>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label>Slug</Label>
              <div className="relative">
                <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 font-mono h-10" value={val} onChange={(e) => setVal(slugify(e.target.value))} maxLength={32} />
              </div>
              <p className="text-xs text-muted-foreground">panela.app/s/{slugify(val) || "—"}</p>
            </div>
            <Button className="w-full h-10" onClick={save} disabled={saving || slugify(val) === slug}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </ResponsiveDialog>
      )}
    </div>
  );
}

/* ─── Server Settings ─── */
function ServerSettingsPanel({
  server, serverId, isOwner, canManage, canKick, members, memberSearch, setMemberSearch,
  kickMember, presence, onServerUpdate,
}: any) {
  const [tab, setTab] = useState("overview");
  const [editName, setEditName] = useState(server.name);
  const [editDesc, setEditDesc] = useState(server.description ?? "");
  const [saving, setSaving] = useState(false);

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from("servers").update({
      name: editName.trim(), description: editDesc.trim() || null,
    }).eq("id", serverId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Servidor atualizado!");
    onServerUpdate({ ...server, name: editName.trim(), description: editDesc.trim() || null });
  }

  const filteredMembers = members.filter((m: any) => {
    if (!memberSearch) return true;
    const p = m.profiles;
    return p?.username?.toLowerCase().includes(memberSearch.toLowerCase()) ||
           p?.display_name?.toLowerCase().includes(memberSearch.toLowerCase());
  });

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
      <div className="p-4 md:p-5 pb-0">
        {/* Server info on top */}
        <div className="flex items-center gap-3 mb-3">
          {server.icon_url
            ? <img src={server.icon_url} className="h-9 w-9 rounded-xl object-cover" alt="" />
            : <div className="h-9 w-9 rounded-xl bg-primary/15 grid place-items-center font-bold text-primary text-sm">{server.name[0]}</div>
          }
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{server.name}</h3>
            <p className="text-[11px] text-muted-foreground">{server.member_count} membros · {server.privacy === "private" ? "Privado" : "Público"}</p>
          </div>
        </div>
        <TabsList className="w-full grid grid-cols-3 h-9">
          <TabsTrigger value="overview" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" /> Geral</TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" /> Membros</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs"><Shield className="h-3.5 w-3.5" /> Cargos</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-5 space-y-4">
        <TabsContent value="overview" className="mt-0 space-y-4">
          {canManage && (
            <div className="rounded-lg border border-border p-4 space-y-3 bg-accent/20">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar servidor</h4>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={3} className="text-sm" />
              </div>
              <Button onClick={saveSettings} disabled={saving} size="sm" className="h-9">
                {saving ? "Salvando..." : "Salvar alterações"}
              </Button>
            </div>
          )}
          <div className="rounded-lg border border-border p-4 space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><span className="text-foreground/60">ID</span><p className="font-mono text-[10px] truncate">{serverId}</p></div>
              <div><span className="text-foreground/60">Slug</span><p>@{server.slug || "—"}</p></div>
              <div><span className="text-foreground/60">Criado em</span><p>{new Date(server.created_at).toLocaleDateString("pt-BR")}</p></div>
              <div><span className="text-foreground/60">Membros</span><p>{server.member_count}</p></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="members" className="mt-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Buscar membros..." className="pl-8 h-9 text-sm" />
          </div>
          <ScrollArea className="h-[280px] -mx-1 px-1">
            <div className="space-y-0.5">
              {filteredMembers.map((m: any) => {
                const p = m.profiles;
                const status = presence.get(m.user_id);
                const online = status != null;
                return (
                  <div key={m.user_id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={p?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[10px]">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={online ? status : "offline"} />
                        <p className="text-sm font-medium truncate">{p?.display_name || p?.username}</p>
                        {m.user_id === server.owner_id && <Crown className="h-3 w-3 text-gold shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground">Nível {m.level} · @{p?.username}</p>
                    </div>
                    <LevelBadge xp={m.xp ?? 0} size="sm" />
                    {canKick && m.user_id !== server.owner_id && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/50 hover:text-destructive shrink-0"
                        onClick={() => kickMember(m.user_id)} title="Remover">
                        <UserMinus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
              {filteredMembers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum membro encontrado.</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="roles" className="mt-0 space-y-3">
          <p className="text-sm text-muted-foreground">Gerencie os cargos e permissões do servidor.</p>
          <ServerRolesDialog serverId={serverId} canManage={canManage} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
