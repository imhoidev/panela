import { createFileRoute, Outlet, Link, useParams, useRouter, useLocation } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MemberList } from "@/components/MemberList";
import { ServerRoles } from "@/components/ServerRoles";
import { ServerStickers } from "@/components/ServerStickers";
import { ServerOverviewTab } from "@/components/ServerOverviewTab";
import { ServerMembersTab } from "@/components/ServerMembersTab";
import { ServerChannelsTab } from "@/components/ServerChannelsTab";
import { ServerEventsDialog } from "@/components/ServerEvents";
import { InvitesDialog } from "@/components/Invites";
import { ModeracaoDialog } from "@/components/ModPanel";
import {
  useServerDetails, useServerChannels, useMemberLevel, useServerMembers,
  useCreateChannel, useDeleteChannel, useKickMember, useUpdateChannel,
  useServerRealtime, usePresenceChannel,
} from "@/hooks/servers";
import {
  Hash, Plus, Settings, LogOut, Volume2, Menu, Users, Copy, AtSign, Check, Shield,
  ChevronDown, Search, MessageSquare, X, Crown, UserMinus,
  Edit3, Globe, Lock, ArrowLeft, Sticker, ScrollText, MessageSquareText, Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { slugify, isValidSlug } from "@/lib/slug";

type ServerCtx = {
  server: any;
  presence: Map<string, string>;
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
  newType: string;
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

  const { data: server, isLoading: serverLoading, refetch: refetchServer } = useServerDetails(serverId);
  const { data: channels = [], isLoading: channelsLoading } = useServerChannels(serverId);
  const { data: memberLevel = 0 } = useMemberLevel(serverId, user?.id);
  const { data: members = [] } = useServerMembers(serverId);
  const createChannel = useCreateChannel(serverId);
  const deleteChannelMut = useDeleteChannel(serverId);
  const updateChannel = useUpdateChannel(serverId);
  const kickMutation = useKickMember(serverId);

  useServerRealtime(serverId);

  const [presence, setPresence] = useState<Map<string, string>>(new Map());
  usePresenceChannel(serverId, user?.id, useCallback((m) => setPresence(m), []));

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newCategory, setNewCategory] = useState("");
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => { setMobileChannelsOpen(false); }, [loc.pathname]);

  // Auto-redirect to first text channel when at server root
  useEffect(() => {
    if (server && channels.length > 0 && loc.pathname === `/app/servers/${serverId}`) {
      const first = channels.find((c: any) => c.type === "text") ?? channels[0];
      router.navigate({ to: "/app/servers/$serverId/$channelId", params: { serverId, channelId: first.id }, replace: true });
    }
  }, [server?.id, channels.length, loc.pathname]);

  // Auto-fix: if owner but not a member
  useEffect(() => {
    if (server && !memberLevel && server.owner_id === user?.id) {
      supabase.from("server_members").insert({ server_id: serverId, user_id: user.id, level: 99 }).then(() => {
        refetchServer();
      });
    }
  }, [server?.id, memberLevel]);

  if (serverLoading || !server) return (
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
  channels.forEach((c: any) => {
    if (c.category) { const arr = categories.get(c.category) ?? []; arr.push(c); categories.set(c.category, arr); }
    else { uncategorized.push(c); }
  });

  const toggleCat = (cat: string) => {
    setCollapsedCats((prev) => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next; });
  };

  const addChannel = () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32);
    createChannel.mutate({ name: slug, type: newType, position: channels.length, category: newCategory.trim() || null });
    setOpen(false); setNewName(""); setNewCategory("");
  };

  const deleteChannel = (channelId: string) => {
    if (!confirm("Deletar este canal permanentemente?")) return;
    deleteChannelMut.mutate(channelId);
  };

  const kickMember = (targetUserId: string) => {
    if (!confirm("Remover este membro?")) return;
    kickMutation.mutate(targetUserId);
  };

  const leave = async () => {
    if (!user) return;
    if (!confirm("Sair desta panela?")) return;
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", user.id);
    router.navigate({ to: "/app/servers" });
  };

  const ctx: ServerCtx = {
    server, presence, channels, categories, uncategorized, collapsedCats, toggleCat,
    mobileChannelsOpen, setMobileChannelsOpen, memberLevel, canManage, isOwner,
    addChannel: () => addChannel(), deleteChannel: (id) => deleteChannel(id),
    open, setOpen, newName, setNewName, newType, setNewType, newCategory, setNewCategory,
  };

  const onlineCount = Array.from(presence.values()).filter((s) => s !== "offline").length;
  const inChannel = loc.pathname.match(/^\/app\/servers\/[^/]+\/[^/]+$/);
  const currentChannelId = inChannel ? loc.pathname.split("/").pop()! : "";

  return (
    <div className="flex h-full min-h-0">
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
                {onlineCount} online
              </span>
              {server.slug && <span className="text-[10px] text-muted-foreground/40">· @{server.slug}</span>}
            </div>
          </div>
          {isOwner && server.slug && <SlugEdit slug={server.slug} serverId={serverId} onSaved={() => refetchServer()} />}
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
                      <div className="p-6 text-center text-xs text-muted-foreground/50 italic">Nenhum canal disponível ainda</div>
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
          members={members} kickMember={kickMember} presence={presence}
          onServerUpdate={(s: any) => refetchServer()}
        />
      </ResponsiveDialog>
    </div>
  );
}

function ChannelsList({ categories, uncategorized, collapsedCats, toggleCat, channels, serverId, loc, canManage, open, setOpen, newName, setNewName, newType, setNewType, newCategory, setNewCategory, addChannel, deleteChannel }: any) {
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
                      <SelectItem value="rules">Regras</SelectItem>
                      <SelectItem value="forum">Forum</SelectItem>
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
            <button onClick={() => toggleCat(cat)}
              className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground/80 transition-colors rounded-md hover:bg-sidebar-accent/30">
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
        {channels.length === 0 && <p className="text-[11px] text-muted-foreground/40 text-center py-8">Nenhum canal ainda</p>}
      </div>
    </ScrollArea>
  );
}

function channelMeta(type: string) {
  switch (type) {
    case "voice": return { icon: Volume2, color: "text-emerald-500" };
    case "announcement": return { icon: MessageSquare, color: "text-amber-500" };
    case "rules": return { icon: ScrollText, color: "text-rose-500" };
    case "forum": return { icon: MessageSquareText, color: "text-violet-500" };
    default: return { icon: Hash, color: "text-primary/70" };
  }
}

function ChannelItem({ c, serverId, loc, canManage, deleteChannel }: any) {
  const active = loc.pathname === `/app/servers/${serverId}/${c.id}`;
  const { icon: Icon, color: iconColor } = channelMeta(c.type);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(c.name);
  const [editTopic, setEditTopic] = useState(c.topic ?? "");
  const [editDesc, setEditDesc] = useState(c.description ?? "");
  const [editMinLevel, setEditMinLevel] = useState(c.min_level ?? 1);

  async function saveChannel() {
    const { error } = await supabase.from("channels").update({
      name: editName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32),
      topic: editTopic.trim() || null,
      description: editDesc.trim() || null,
      min_level: editMinLevel,
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setEditOpen(false);
    toast.success("Canal atualizado");
  }

  return (
    <div className={`${active ? "relative " : ""}group`}>
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />}
      <Link to="/app/servers/$serverId/$channelId" params={{ serverId, channelId: c.id }}
        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm flex-1 min-w-0 transition-all ml-1 ${
          active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
        }`}>
        <Icon className={`h-4 w-4 shrink-0 ${iconColor} ${active ? "drop-shadow-sm" : ""}`} />
        <span className="truncate text-[13px]">{c.name}</span>
      </Link>
      {canManage && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
          <button onClick={() => { setEditName(c.name); setEditTopic(c.topic ?? ""); setEditDesc(c.description ?? ""); setEditMinLevel(c.min_level ?? 1); setEditOpen(true); }}
            className="p-1 text-muted-foreground/40 hover:text-foreground transition-colors" title="Editar canal">
            <Pencil className="h-3 w-3" />
          </button>
          <button onClick={() => deleteChannel(c.id)}
            className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors" title="Deletar canal">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      <ResponsiveDialog open={editOpen} onOpenChange={setEditOpen} title="Editar canal" className="max-w-md">
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10" maxLength={32} /></div>
          <div className="space-y-1.5"><Label>Tópico</Label><Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} className="h-10" maxLength={128} placeholder="Assunto do canal..." /></div>
          {c.type === "rules" && (
            <div className="space-y-1.5">
              <Label>Regras</Label>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none min-h-[100px]" maxLength={2000} placeholder="Escreva as regras do servidor..." />
            </div>
          )}
          {c.type === "text" && (
            <div className="space-y-1.5"><Label>Descrição</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-10" maxLength={300} placeholder="Descrição do canal..." /></div>
          )}
          <div className="space-y-1.5">
            <Label>Nível mínimo: {editMinLevel}</Label>
            <div className="flex items-center gap-2">
              <input type="range" min={1} max={99} value={editMinLevel} onChange={(e) => setEditMinLevel(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-sm font-mono text-muted-foreground w-8 text-center">{editMinLevel}</span>
            </div>
          </div>
          <Button onClick={saveChannel} className="w-full h-10">Salvar</Button>
        </div>
      </ResponsiveDialog>
    </div>
  );
}

function ServerToolbar({ canManage, isOwner, serverId, server, leave, settingsOpen, setSettingsOpen, toolsOpen, setToolsOpen }: any) {
  return (
    <div className="border-t border-sidebar-border bg-sidebar/80 shrink-0">
      {toolsOpen && (
        <div className="p-2 flex flex-wrap gap-1 border-b border-sidebar-border bg-sidebar/50">
          <ServerEventsDialog serverId={serverId} canManage={canManage} />
          <InvitesDialog serverId={serverId} canManage={canManage} />
          <ModeracaoDialog serverId={serverId} canManage={canManage} />
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

function ServerSettingsPanel({ server, serverId, isOwner, canManage, canKick, members, kickMember, presence, onServerUpdate }: any) {
  const [tab, setTab] = useState("overview");
  return (
    <Tabs value={tab} onValueChange={setTab} className="flex flex-col h-full">
      <div className="p-4 md:p-5 pb-0">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="relative shrink-0">
            {server.icon_url ? <img src={server.icon_url} className="h-9 w-9 rounded-xl object-cover ring-2 ring-border" alt="" /> : (
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-border grid place-items-center font-bold text-primary text-sm">{server.name[0]?.toUpperCase()}</div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate leading-tight">{server.name}</h3>
            <p className="text-[10px] text-muted-foreground/60">{server.member_count} {server.member_count === 1 ? "membro" : "membros"} · {server.privacy === "private" ? "Privado" : "Público"}</p>
          </div>
        </div>
        <TabsList className="w-full h-8">
          <TabsTrigger value="overview" className="text-xs gap-1"><Settings className="h-3 w-3" />Geral</TabsTrigger>
          <TabsTrigger value="members" className="text-xs gap-1"><Users className="h-3 w-3" />Membros</TabsTrigger>
          <TabsTrigger value="channels" className="text-xs gap-1"><Hash className="h-3 w-3" />Canais</TabsTrigger>
          <TabsTrigger value="roles" className="text-xs gap-1"><Shield className="h-3 w-3" />Cargos</TabsTrigger>
          <TabsTrigger value="stickers" className="text-xs gap-1"><Sticker className="h-3 w-3" />Figurinhas</TabsTrigger>
        </TabsList>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-5">
        <TabsContent value="overview" className="mt-0">
          <ServerOverviewTab server={server} serverId={serverId} isOwner={isOwner} canManage={canManage} onServerUpdate={onServerUpdate} />
        </TabsContent>
        <TabsContent value="members" className="mt-0">
          <ServerMembersTab server={server} serverId={serverId} canManage={canManage} canKick={canKick}
            members={members} kickMember={kickMember} presence={presence} isOwner={isOwner} />
        </TabsContent>
        <TabsContent value="channels" className="mt-0">
          <ServerChannelsTab serverId={serverId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="roles" className="mt-0 space-y-3">
          <ServerRoles serverId={serverId} canManage={canManage} />
        </TabsContent>
        <TabsContent value="stickers" className="mt-0 space-y-3">
          <ServerStickers serverId={serverId} canManage={canManage} />
        </TabsContent>
      </div>
    </Tabs>
  );
}

function MobileChannelLink({ c, serverId, currentId }: { c: any; serverId: string; currentId: string }) {
  const active = currentId === c.id;
  const { icon: Icon, color: iconColor } = channelMeta(c.type);
  return (
    <Link to="/app/servers/$serverId/$channelId" params={{ serverId, channelId: c.id }}
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all ${
        active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"
      }`}>
      <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
      <span className="truncate">{c.name}</span>
    </Link>
  );
}
