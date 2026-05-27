import { createFileRoute, Outlet, Link, useParams, useRouter, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Hash, Plus, Settings, LogOut, Volume2, Menu, Users, Copy, AtSign, Check } from "lucide-react";
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
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);

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
  useEffect(() => { load(); }, [serverId, user?.id]);

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
    });
    if (error) return toast.error(error.message);
    setOpen(false); setNewName("");
  }
  async function leave() {
    if (!user) return;
    if (!confirm("Sair desta panela?")) return;
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", user.id);
    router.navigate({ to: "/app/servers" });
  }

  if (!server) return <div className="p-8 text-muted-foreground">Carregando servidor…</div>;
  const canManage = memberLevel >= 80;

  const channelsList = (
    <ChannelsBlock
      server={server}
      channels={channels}
      serverId={serverId}
      loc={loc}
      canManage={canManage}
      open={open}
      setOpen={setOpen}
      newName={newName}
      setNewName={setNewName}
      newType={newType}
      setNewType={setNewType}
      addChannel={addChannel}
      leave={leave}
    />
  );

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">{channelsList}</aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        {/* Sub-header mobile do servidor (acima do header do canal) */}
        <div className="md:hidden flex items-center gap-2 px-2 h-10 border-b border-border bg-sidebar/80">
          <Sheet open={mobileChannelsOpen} onOpenChange={setMobileChannelsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5"><Menu className="h-4 w-4" />Canais</Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px] bg-sidebar flex flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>Canais</SheetTitle>
                <SheetDescription>Lista de canais e ações.</SheetDescription>
              </SheetHeader>
              {channelsList}
            </SheetContent>
          </Sheet>
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{server.member_count}</div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

function ChannelsBlock({
  server, channels, serverId, loc, canManage, open, setOpen, newName, setNewName, newType, setNewType, addChannel, leave,
}: any) {
  return (
    <>
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold truncate">{server.name}</h2>
        <p className="text-xs text-muted-foreground truncate">{server.member_count} membros</p>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        <div className="flex items-center justify-between px-2 py-1 text-xs uppercase tracking-wide text-muted-foreground">
          <span>Canais</span>
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><button className="hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button></DialogTrigger>
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
                  <div className="space-y-1.5"><Label>Nome</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="nome-do-canal" /></div>
                  <Button onClick={addChannel} className="w-full">Criar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {channels.map((c: any) => {
          const path = `/app/servers/${serverId}/${c.id}`;
          const active = loc.pathname === path;
          const Icon = c.type === "voice" ? Volume2 : Hash;
          return (
            <Link key={c.id} to="/app/servers/$serverId/$channelId" params={{ serverId, channelId: c.id }}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}>
              <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{c.name}</span>
            </Link>
          );
        })}
      </div>
      <div className="p-2 border-t border-sidebar-border flex gap-1">
        {canManage && <Button variant="ghost" size="sm" className="flex-1 justify-start" disabled><Settings className="h-4 w-4 mr-1.5" />Config</Button>}
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={leave}><LogOut className="h-4 w-4" /></Button>
      </div>
    </>
  );
}
