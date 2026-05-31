import { createFileRoute, Outlet, Link, useParams, useRouter, useLocation } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
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
  ChevronDown, Search, MessageSquare, X, Crown, UserMinus,
  Edit3, Globe, Lock, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { slugify, isValidSlug } from "@/lib/slug";

/* ─── Context for child routes ─── */
type ServerCtx = {
  server: any;
  channels: any[];
  categories: Map<string, any[]>;
  uncategorized: any[];
  collapsedCats: Set<string>;
  toggleCat: (cat: string) => void;
  mobileChannelsOpen: boolean;
  setMobileChannelsOpen: (v: boolean) => void;
  memberLevel: number;
  canManage: boolean;
  isOwner: boolean;
  addChannel: () => void;
  deleteChannel: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  newName: string;
  setNewName: (v: string) => void;
  newType: "text" | "voice" | "announcement";
  setNewType: (v: any) => void;
  newCategory: string;
  setNewCategory: (v: string) => void;
};
const ServerCtx_ = createContext<ServerCtx | null>(null);
export function useServerContext() { return useContext(ServerCtx_); }

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
    let [{ data: s }, { data: ch }, { data: mem }] = await Promise.all([
      supabase.from("servers").select("*").eq("id", serverId).maybeSingle(),
      supabase.from("channels").select("*").eq("server_id", serverId).order("position"),
      supabase.from("server_members").select("level").eq("server_id", serverId).eq("user_id", user.id).maybeSingle(),
    ]);
    // Auto-fix: if owner but not a member (trigger wasn't applied for existing servers)
    if (s && !mem && s.owner_id === user.id) {
      await supabase.from("server_members").insert({
        server_id: serverId, user_id: user.id, level: 99,
      });
      mem = { level: 99 };
      // Re-fetch channels now that we're a member
      const { data: ch2 } = await supabase
        .from("channels").select("*").eq("server_id", serverId).order("position");
      ch = ch2;
    }
    setServer(s); setChannels(ch ?? []); setMemberLevel(mem?.level ?? 0);
    if (s && ch && ch.length > 0 && loc.pathname === `/app/servers/${serverId}`) {
      const first = ch.find((c: any) => c.type === "text") ?? ch[0];
      router.navigate({ to: "/app/servers/$serverId/$channelId", params: { serverId, channelId: first.id }, replace: true });
    }
  }

  async function loadMembers() {
    const { data: mems } = await supabase
      .from("server_members")
      .select("user_id, level, xp")
      .eq("server_id", serverId);
    if (!mems?.length) { setMembers([]); return; }
    const userIds = mems.map((m) => m.user_id);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, name_color, name_colors, name_effect, current_plan, status_text")
      .in("id", userIds);
    const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    // Sort: owner first, then by level desc, then by name
    const sorted = mems
      .map((m) => ({ ...m, profiles: profMap[m.user_id] || null }))
      .sort((a, b) => {
        if (a.user_id === server?.owner_id) return -1;
        if (b.user_id === server?.owner_id) return 1;
        if (b.level !== a.level) return b.level - a.level;
        const na = a.profiles?.display_name || a.profiles?.username || "";
        const nb = b.profiles?.display_name || b.profiles?.username || "";
        return na.localeCompare(nb);
      });
    setMembers(sorted);
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

  if (!server) return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8 bg-gradient-to-b from-transparent to-card/10">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <span>Carregando servidor…</span>
      </div>
    </div>
  );

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

  const ctx: ServerCtx = {
    server, channels, categories, uncategorized, collapsedCats, toggleCat,
    mobileChannelsOpen, setMobileChannelsOpen, memberLevel, canManage, isOwner,
    addChannel: () => addChannel(), deleteChannel: (id) => deleteChannel(id),
    open, setOpen, newName, setNewName, newType, setNewType, newCategory, setNewCategory,
  };

  const onlineCount = Array.from(presence.values()).filter((s) => s !== "offline").length;
  const inChannel = loc.pathname.match(/^\/app\/servers\/[^/]+\/[^/]+$/);
  const currentChannelId = inChannel ? loc.pathname.split("/").pop()! : "";

  return (
    <div className="flex h-full min-h-0">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar/95 shrink-0">
        <div className="p-3 border-b border-sidebar-border flex items-center gap-2.5">
          {server.icon_url ? (
            <img src={server.icon_url} alt="" className="h-9 w-9 rounded-xl object-cover ring-2 ring-sidebar-border/60" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/40 to-primary/10 ring-2 ring-sidebar-border/60 grid place-items-center font-bold text-primary text-sm">
              {server.name[0]?.toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold truncate text-sm leading-tight">{server.name}</h2>
            <div className="flex items-center gap-1.5 mt-px">
              <span className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
                {server.privacy === "private" ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                {server.member_count} {server.member_count === 1 ? "membro" : "membros"}
                <span className="text-muted-foreground/30 mx-0.5">·</span>
                {Array.from(presence.values()).filter((s) => s !== "offline").length} online
              </span>
              {server.slug && <span className="text-[10px] text-muted-foreground/40">· @{server.slug}</span>}
            </div>
          </div>
          {isOwner && server.slug && <SlugEdit slug={server.slug} serverId={serverId} onSaved={load} />}
        </div>

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
        {/* Mobile top bar — only at server root (no channel selected) */}
        {!inChannel && (
          <div className="md:hidden flex items-center gap-2 px-3 h-12 border-b border-border bg-sidebar/95 backdrop-blur shrink-0">
            <Link to="/app/servers" className="md:hidden text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            {server.icon_url ? (
              <img src={server.icon_url} alt="" className="h-7 w-7 rounded-lg object-cover" />
            ) : (
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center font-bold text-primary text-[10px]">
                {server.name[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-tight">{server.name}</p>
              <p className="text-[10px] text-muted-foreground/60 leading-tight">{server.member_count} {server.member_count === 1 ? "membro" : "membros"}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSettingsOpen(true)} title="Configurações">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile channel sheet */}
        {inChannel && (
          <>
            <div className="md:hidden fixed bottom-20 right-4 z-30">
              <Button size="icon" className="h-12 w-12 rounded-full shadow-xl shadow-black/30 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setMobileChannelsOpen(true)} title="Mudar de canal">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
            <Sheet open={mobileChannelsOpen} onOpenChange={setMobileChannelsOpen}>
              <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px] bg-sidebar flex flex-col z-50">
                <div className="p-3 border-b border-sidebar-border flex items-center gap-2.5">
                  {server.icon_url ? (
                    <img src={server.icon_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/40 to-primary/10 grid place-items-center font-bold text-primary text-sm">
                      {server.name[0]?.toUpperCase() || "S"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold truncate text-sm">{server.name}</h2>
                    <p className="text-[10px] text-muted-foreground/60">{channels.length} canais</p>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-0.5">
                    {uncategorized.map((c: any) => (
                      <MobileChannelLink key={c.id} c={c} serverId={serverId} currentId={currentChannelId} />
                    ))}
                    {[...categories.entries()].map(([cat, chs]) => (
                      <div key={cat}>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold px-2.5 py-1.5">{cat}</p>
                        {chs.map((c: any) => (
                          <MobileChannelLink key={c.id} c={c} serverId={serverId} currentId={currentChannelId} />
                        ))}
                      </div>
                    ))}
                    {channels.length === 0 && (
                      <div className="p-6 text-center text-xs text-muted-foreground/50 italic">
                        Nenhum canal disponível ainda
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </>
        )}

        <ServerCtx_.Provider value={ctx}>
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 min-w-0 min-h-0">
              <Outlet />
            </div>
            {memberLevel > 0 && (
              <div className="hidden md:flex shrink-0">
                <MemberList serverId={serverId} presence={presence} />
              </div>
            )}
          </div>
        </ServerCtx_.Provider>
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

/* ─── Channels List ─── */
function ChannelsList({
  categories, uncategorized, collapsedCats, toggleCat, channels,
  serverId, loc, canManage, open, setOpen, newName, setNewName,
  newType, setNewType, newCategory, setNewCategory, addChannel, deleteChannel,
}: any) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-2 space-y-0.5">
        <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50">
          <span className="font-semibold">Canais</span>
          {canManage && (
            <ResponsiveDialog open={open} onOpenChange={setOpen}
              title="Novo canal"
              trigger={<button className="hover:text-foreground p-0.5 rounded hover:bg-sidebar-accent/60 transition-colors" title="Criar canal"><Plus className="h-3.5 w-3.5" /></button>}>
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

        {uncategorized.map((c: any) => (
          <ChannelItem key={c.id} c={c} serverId={serverId} loc={loc} canManage={canManage} deleteChannel={deleteChannel} />
        ))}

        {[...categories.entries()].map(([cat, chs]) => (
          <div key={cat}>
            <button
              onClick={() => toggleCat(cat)}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground/80 transition-colors rounded-md hover:bg-sidebar-accent/30"
            >
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${collapsedCats.has(cat) ? "-rotate-90" : ""}`} />
              <span className="font-semibold">{cat}</span>
              <span className="ml-auto text-[9px] text-muted-foreground/40 font-mono">{chs.length}</span>
            </button>
            <div className={`overflow-hidden transition-all duration-200 ${collapsedCats.has(cat) ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"}`}>
              {chs.map((c: any) => (
                <ChannelItem key={c.id} c={c} serverId={serverId} loc={loc} canManage={canManage} deleteChannel={deleteChannel} />
              ))}
            </div>
          </div>
        ))}

        {channels.length === 0 && (
          <p className="text-[11px] text-muted-foreground/40 text-center py-8">Nenhum canal ainda</p>
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
    <div className={`${active ? "relative " : ""}group`}>
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
      )}
      <Link
        to="/app/servers/$serverId/$channelId"
        params={{ serverId, channelId: c.id }}
        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm flex-1 min-w-0 transition-all ml-1 ${
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
            : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${iconColor} ${active ? "drop-shadow-sm" : ""}`} />
        <span className="truncate text-[13px]">{c.name}</span>
      </Link>
      {canManage && (
        <button
          onClick={() => deleteChannel(c.id)}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/40 hover:text-destructive shrink-0 transition-all hover:scale-110"
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
    <div className="border-t border-sidebar-border bg-sidebar/80 shrink-0">
      {toolsOpen && (
        <div className="p-2 flex flex-wrap gap-1 border-b border-sidebar-border bg-sidebar/50">
          <ServerRolesDialog serverId={serverId} canManage={canManage} />
          <ServerEventsDialog serverId={serverId} canManage={canManage} />
          <InvitesDialog serverId={serverId} canManage={canManage} />
          <ThemeDialog serverId={serverId} server={server} canManage={canManage} />
          <BanDialog serverId={serverId} canManage={canManage} />
        </div>
      )}
      <div className="flex items-center px-1.5 py-1.5">
        <button onClick={() => setSettingsOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50 transition-colors" title="Configurações">
          <Settings className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ajustes</span>
        </button>
        {(canManage || isOwner) && (
          <button onClick={() => setToolsOpen(!toolsOpen)}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50 transition-colors" title="Ferramentas">
            <Shield className="h-3.5 w-3.5" /><span className="hidden sm:inline">Ferram.</span>
          </button>
        )}
        <button onClick={leave}
          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Sair do servidor">
          <LogOut className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Slug Edit (inline compact) ─── */
function SlugEdit({ slug, serverId, onSaved }: { slug: string; serverId: string; onSaved: () => void }) {
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [val, setVal] = useState(slug);
  const [saving, setSaving] = useState(false);

  async function copy() {
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

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={copy} className="p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground/40 hover:text-foreground transition-colors" title="Copiar link do servidor">
        {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
      </button>
      <button onClick={() => { setEditOpen(true); setVal(slug); }}
        className="p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground/40 hover:text-foreground transition-colors" title="Editar slug">
        <Edit3 className="h-3 w-3" />
      </button>
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen} title="Editar slug">
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
    </div>
  );
}

/* ─── Server Settings ─── */
function ServerSettingsPanel({
  server, serverId, isOwner, canManage, canKick, members, memberSearch, setMemberSearch,
  kickMember, presence, onServerUpdate,
}: any) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [editName, setEditName] = useState(server.name);
  const [editDesc, setEditDesc] = useState(server.description ?? "");
  const [editPrivacy, setEditPrivacy] = useState(server.privacy || "public");
  const [saving, setSaving] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [memberSort, setMemberSort] = useState("level");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(server.name);
    setEditDesc(server.description ?? "");
    setEditPrivacy(server.privacy || "public");
  }, [server.name, server.description, server.privacy]);

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from("servers").update({
      name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy,
    }).eq("id", serverId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Servidor atualizado!");
    onServerUpdate({ ...server, name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy });
  }

  async function uploadIcon(file: File) {
    if (uploadingIcon) return;
    setUploadingIcon(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("server_id", serverId);
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/upload-server-icon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload falhou"); }
      const { url } = await res.json();
      await supabase.from("servers").update({ icon_url: url }).eq("id", serverId);
      onServerUpdate({ ...server, icon_url: url });
      toast.success("Ícone atualizado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingIcon(false);
    }
  }

  async function deleteServer() {
    if (!confirm("TEM CERTEZA? Esta ação é irreversível. Todos os canais, mensagens e dados serão perdidos.")) return;
    if (!confirm("Sério mesmo? Digite CONFIRMAR para deletar.")) return;
    setDeleting(true);
    const { error } = await supabase.from("servers").delete().eq("id", serverId);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Servidor deletado.");
    router.navigate({ to: "/app/servers" });
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

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
      <div className="p-4 md:p-5 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            {server.icon_url ? (
              <img src={server.icon_url} className="h-10 w-10 rounded-xl object-cover ring-2 ring-border" alt="" />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-border grid place-items-center font-bold text-primary text-base">
                {server.name[0]?.toUpperCase()}
              </div>
            )}
            {canManage && (
              <>
                <input type="file" ref={fileRef} className="hidden" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIcon(f); e.target.value = ""; }} />
                <button onClick={() => fileRef.current?.click()} disabled={uploadingIcon}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground grid place-items-center text-[10px] border-2 border-background hover:scale-110 transition-transform disabled:opacity-50"
                  title="Trocar ícone">
                  {uploadingIcon ? "..." : "✎"}
                </button>
              </>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">{server.name}</h3>
            <p className="text-[11px] text-muted-foreground">{server.member_count} {server.member_count === 1 ? "membro" : "membros"} · {editPrivacy === "private" ? "Privado" : "Público"}</p>
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
            <div className="rounded-xl border border-border p-4 sm:p-5 space-y-4 bg-accent/15">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar servidor</h4>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} className="h-10 text-sm" placeholder="Nome do servidor" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={3} className="text-sm resize-none" placeholder="Descrição do servidor..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Visibilidade</Label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditPrivacy("public")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border h-10 text-sm transition-all ${
                      editPrivacy === "public" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}>
                    <Globe className="h-4 w-4" /> Público
                  </button>
                  <button type="button" onClick={() => setEditPrivacy("private")}
                    className={`flex-1 flex items-center justify-center gap-2 rounded-lg border h-10 text-sm transition-all ${
                      editPrivacy === "private" ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                    }`}>
                    <Lock className="h-4 w-4" /> Privado
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={saveSettings} disabled={saving} className="h-10 flex-1">
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
                {editName !== server.name || editDesc !== (server.description ?? "") || editPrivacy !== (server.privacy || "public") ? (
                  <Button variant="ghost" onClick={() => { setEditName(server.name); setEditDesc(server.description ?? ""); setEditPrivacy(server.privacy || "public"); }} className="h-10">
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-border p-4 sm:p-5 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
              <div><span className="text-muted-foreground/60">ID</span><p className="font-mono text-[10px] truncate mt-0.5 text-muted-foreground/80">{serverId}</p></div>
              <div><span className="text-muted-foreground/60">Slug</span><p className="mt-0.5 text-muted-foreground/80">@{server.slug || "—"}</p></div>
              <div><span className="text-muted-foreground/60">Criado em</span><p className="mt-0.5 text-muted-foreground/80">{new Date(server.created_at).toLocaleDateString("pt-BR")}</p></div>
              <div><span className="text-muted-foreground/60">Membros</span><p className="mt-0.5 text-muted-foreground/80">{server.member_count}</p></div>
            </div>
          </div>
          {isOwner && (
            <div className="rounded-xl border border-destructive/20 p-4 sm:p-5 space-y-3 bg-destructive/5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive/80">Zona de Perigo</h4>
              <p className="text-xs text-muted-foreground">Deletar o servidor remove todos os canais, mensagens e arquivos. Esta ação não pode ser desfeita.</p>
              <Button variant="destructive" onClick={deleteServer} disabled={deleting} className="h-10">
                {deleting ? "Deletando..." : "Deletar servidor"}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="mt-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Buscar membros..." className="pl-8 h-10 text-sm" />
            </div>
            <select value={memberSort} onChange={(e) => setMemberSort(e.target.value)}
              className="h-10 rounded-lg border border-border bg-background px-2.5 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
              <option value="level">Nível</option>
              <option value="name">Nome</option>
              <option value="online">Online</option>
            </select>
          </div>
          {filteredMembers.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground/60">
              <Users className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs font-medium">{memberSearch ? "Ninguém encontrado" : "Nenhum membro"}</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] -mx-1 px-1">
              <div className="space-y-1">
                {filteredMembers.map((m: any) => {
                  const p = m.profiles;
                  const status = presence.get(m.user_id);
                  const online = status != null && status !== "offline";
                  return (
                    <div key={m.user_id} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/30 transition-colors group">
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 ring-1 ring-border/30">
                          <AvatarImage src={p?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px]">{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-[10px] w-[10px] rounded-full border-2 border-card ${
                          online ? (status === "idle" ? "bg-yellow-500" : status === "dnd" ? "bg-red-500" : "bg-emerald-500") : "bg-muted-foreground/30"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{p?.display_name || p?.username}</p>
                          {m.user_id === server.owner_id && <Crown className="h-3 w-3 text-yellow-500 shrink-0" />}
                          {m.level >= 80 && <Shield className="h-3 w-3 text-blue-400 shrink-0" title="Admin" />}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                          <span>@{p?.username}</span>
                          <span className="text-muted-foreground/30">·</span>
                          <span>Nv.{m.level}</span>
                          {p?.status_text && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span className="truncate italic text-muted-foreground/50">&ldquo;{p.status_text}&rdquo;</span>
                            </>
                          )}
                        </div>
                      </div>
                      <LevelBadge xp={m.xp ?? 0} size="sm" />
                      {canKick && m.user_id !== server.owner_id && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => kickMember(m.user_id)} title="Remover membro">
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="roles" className="mt-0 space-y-3">
          <p className="text-sm text-muted-foreground/70">Gerencie os cargos e permissões do servidor.</p>
          <ServerRolesDialog serverId={serverId} canManage={canManage} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

function MobileChannelLink({ c, serverId, currentId }: { c: any; serverId: string; currentId: string }) {
  const active = currentId === c.id;
  const Icon = c.type === "voice" ? Volume2 : c.type === "announcement" ? MessageSquare : Hash;
  return (
    <Link
      to="/app/servers/$serverId/$channelId"
      params={{ serverId, channelId: c.id }}
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all ${
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${c.type === "voice" ? "text-emerald-500" : c.type === "announcement" ? "text-amber-500" : "text-primary/70"}`} />
      <span className="truncate">{c.name}</span>
    </Link>
  );
}
