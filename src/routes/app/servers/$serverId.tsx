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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  ChevronDown, ChevronRight, Search, MessageSquare,
  X, Crown, UserMinus,
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

  // Socket.io presence
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
      .select("user_id, level, profiles!inner(username,display_name,avatar_url)")
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

  // Group channels by category
  const categories = new Map<string, any[]>();
  const uncategorized: any[] = [];
  channels.forEach((c) => {
    if (c.category) {
      const arr = categories.get(c.category) ?? [];
      arr.push(c);
      categories.set(c.category, arr);
    } else {
      uncategorized.push(c);
    }
  });

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const channelsList = (
    <ChannelsBlock
      server={server}
      channels={channels}
      categories={categories}
      uncategorized={uncategorized}
      collapsedCats={collapsedCats}
      toggleCat={toggleCat}
      serverId={serverId}
      loc={loc}
      canManage={canManage}
      isOwner={isOwner}
      open={open}
      setOpen={setOpen}
      newName={newName}
      setNewName={setNewName}
      newType={newType}
      setNewType={setNewType}
      newCategory={newCategory}
      setNewCategory={setNewCategory}
      addChannel={addChannel}
      deleteChannel={deleteChannel}
      leave={leave}
      onSlugChanged={load}
    />
  );

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">{channelsList}</aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-2 px-2 h-11 border-b border-border bg-sidebar/80 shrink-0">
          <Sheet open={mobileChannelsOpen} onOpenChange={setMobileChannelsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5"><Menu className="h-4 w-4" />Canais</Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[300px] bg-sidebar flex flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>Canais</SheetTitle>
                <SheetDescription>Lista de canais e ações.</SheetDescription>
              </SheetHeader>
              {channelsList}
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

      {/* Server Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-2xl h-[80vh] p-0">
          <DialogHeader className="sr-only"><DialogTitle>Configurações do servidor</DialogTitle></DialogHeader>
          <ServerSettingsPanel
            server={server}
            serverId={serverId}
            isOwner={isOwner}
            canManage={canManage}
            canKick={canKick}
            members={members}
            memberSearch={memberSearch}
            setMemberSearch={setMemberSearch}
            kickMember={kickMember}
            presence={presence}
            onServerUpdate={(s: any) => setServer(s)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelsBlock({
  server, channels, categories, uncategorized, collapsedCats, toggleCat,
  serverId, loc, canManage, isOwner, open, setOpen, newName, setNewName,
  newType, setNewType, newCategory, setNewCategory, addChannel, deleteChannel, leave, onSlugChanged,
}: any) {
  return (
    <>
      <div className="p-4 border-b border-sidebar-border space-y-1.5">
        <h2 className="font-semibold truncate text-base">{server.name}</h2>
        <SlugTag slug={server.slug} canEdit={isOwner} serverId={serverId} onSaved={onSlugChanged} />
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Users className="h-3 w-3" />{server.member_count} membros
        </p>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="flex items-center justify-between px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          <span className="font-semibold">Canais</span>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><button className="hover:text-foreground p-0.5"><Plus className="h-3.5 w-3.5" /></button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo canal</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texto</SelectItem>
                        <SelectItem value="voice">Voz</SelectItem>
                        <SelectItem value="announcement">Anúncios</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="nome-do-canal" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Categoria (opcional)</Label>
                    <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="ex: Geral, Voz, Jogos" />
                  </div>
                  <Button onClick={addChannel} className="w-full">Criar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Categorized channels */}
        {[...categories.entries()].map(([cat, chs]) => (
          <div key={cat} className="mb-1">
            <button
              onClick={() => toggleCat(cat)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground w-full"
            >
              {collapsedCats.has(cat) ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span className="font-semibold">{cat}</span>
            </button>
            {!collapsedCats.has(cat) && chs.map((c: any) => (
              <ChannelItem key={c.id} c={c} serverId={serverId} loc={loc} canManage={canManage} deleteChannel={deleteChannel} />
            ))}
          </div>
        ))}

        {/* Uncategorized */}
        {uncategorized.map((c: any) => (
          <ChannelItem key={c.id} c={c} serverId={serverId} loc={loc} canManage={canManage} deleteChannel={deleteChannel} />
        ))}
      </ScrollArea>
      <div className="p-2 border-t border-sidebar-border flex flex-wrap gap-1">
        <ServerRolesDialog serverId={serverId} canManage={canManage} />
        <ServerEventsDialog serverId={serverId} canManage={canManage} />
        <InvitesDialog serverId={serverId} canManage={canManage} />
        <ThemeDialog serverId={serverId} server={server} canManage={canManage} />
        <BanDialog serverId={serverId} canManage={canManage} />
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive ml-auto" onClick={leave}><LogOut className="h-4 w-4" /></Button>
      </div>
    </>
  );
}

function ChannelItem({ c, serverId, loc, canManage, deleteChannel }: any) {
  const path = `/app/servers/${serverId}/${c.id}`;
  const active = loc.pathname === path;
  const Icon = c.type === "voice" ? Volume2 : c.type === "announcement" ? MessageSquare : Hash;
  return (
    <div className="group flex items-center rounded-md">
      <Link
        key={c.id}
        to="/app/servers/$serverId/$channelId"
        params={{ serverId, channelId: c.id }}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm flex-1 min-w-0 ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{c.name}</span>
      </Link>
      {canManage && (
        <button
          onClick={() => deleteChannel(c.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

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
      name: editName.trim(),
      description: editDesc.trim() || null,
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
      <div className="p-5 pb-0">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2">
            {server.icon_url ? <img src={server.icon_url} className="h-6 w-6 rounded" /> : null}
            {server.name}
          </DialogTitle>
          <DialogDescription>Gerencie as configurações da panela</DialogDescription>
        </DialogHeader>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="overview" className="gap-1.5"><Settings className="h-4 w-4" /> Geral</TabsTrigger>
          <TabsTrigger value="members" className="gap-1.5"><Users className="h-4 w-4" /> Membros</TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5"><Shield className="h-4 w-4" /> Cargos</TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <TabsContent value="overview" className="space-y-4 mt-0">
          {canManage && (
            <>
              <div className="space-y-1.5">
                <Label>Nome do servidor</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={3} />
              </div>
              <Button onClick={saveSettings} disabled={saving}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
            </>
          )}
          <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t border-border">
            <p><strong>ID:</strong> <code className="text-xs">{serverId}</code></p>
            <p><strong>Slug:</strong> @{server.slug || "—"}</p>
            <p><strong>Privacidade:</strong> {server.privacy === "private" ? "🔒 Privado" : "🌍 Público"}</p>
            <p><strong>Criado em:</strong> {new Date(server.created_at).toLocaleDateString("pt-BR")}</p>
            <p><strong>Membros:</strong> {server.member_count}</p>
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-3 mt-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Buscar membros..."
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredMembers.map((m: any) => {
                const p = m.profiles;
                const online = presence.has(m.user_id);
                return (
                  <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={p?.avatar_url ?? undefined} />
                      <AvatarFallback>{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <StatusDot status={online ? (presence.get(m.user_id) || "online") : "offline"} />
                        <p className="text-sm font-medium truncate">{p?.display_name || p?.username}</p>
                        {m.user_id === server.owner_id && <Crown className="h-3.5 w-3.5 text-gold" />}
                      </div>
                      <p className="text-xs text-muted-foreground">Nível {m.level} · @{p?.username}</p>
                    </div>
                    <LevelBadge xp={0} size="sm" />
                    {canKick && m.user_id !== server.owner_id && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => kickMember(m.user_id)}>
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="roles" className="mt-0">
          <p className="text-sm text-muted-foreground">Gerencie os cargos internos do servidor.</p>
          <div className="mt-3">
            <ServerRolesDialog serverId={serverId} canManage={canManage} />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

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
    <div className="flex items-center gap-1 text-[11px] text-muted-foreground/90">
      <AtSign className="h-3 w-3 shrink-0" />
      <span className="truncate font-mono">{slug}</span>
      <button onClick={copy} className="ml-1 p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground hover:text-foreground" title="Copiar link">
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      </button>
      {canEdit && (
        <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (o) setVal(slug); }}>
          <DialogTrigger asChild>
            <button className="p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground hover:text-foreground" title="Editar slug">
              <Settings className="h-3 w-3" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar slug</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Slug</Label>
                <div className="relative">
                  <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8 font-mono" value={val} onChange={(e) => setVal(slugify(e.target.value))} maxLength={32} />
                </div>
                <p className="text-xs text-muted-foreground">panela.app/s/{slugify(val) || "—"}</p>
              </div>
              <Button className="w-full" onClick={save} disabled={saving || slugify(val) === slug}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
