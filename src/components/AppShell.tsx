import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useAuth, isStaff } from "@/hooks/use-auth";
import { PanelaLogo } from "./PanelaLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, Users, Settings, Crown, LogOut, Sparkles, Compass, Plus, Hash } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const router = useRouter();
  const loc = useLocation();
  const [myServers, setMyServers] = useState<{ id: string; name: string; icon_url: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const { data: mem } = await supabase.from("server_members").select("server_id").eq("user_id", user!.id);
      const ids = (mem ?? []).map((m) => m.server_id);
      if (!ids.length) { if (!cancelled) setMyServers([]); return; }
      const { data } = await supabase.from("servers").select("id,name,icon_url").in("id", ids);
      if (!cancelled) setMyServers(data ?? []);
    }
    load();
    const ch = supabase.channel(`my-servers-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return <div className="min-h-screen">{children}</div>;

  const nav = [
    { to: "/app", label: "Início", icon: Home },
    { to: "/app/servers", label: "Meus servidores", icon: Hash },
    { to: "/app/discover", label: "Descobrir", icon: Compass },
    { to: "/app/profile", label: "Meu perfil", icon: Users },
    { to: "/app/plans", label: "Planos", icon: Sparkles },
    { to: "/app/settings", label: "Configurações", icon: Settings },
  ] as const;

  const activeServerId = loc.pathname.startsWith("/app/servers/") ? loc.pathname.split("/")[3] : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Rail de servidores */}
      <aside className="hidden md:flex w-[72px] flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3 overflow-y-auto">
        <Link to="/app" className={`grid place-items-center rounded-2xl h-12 w-12 font-bold transition-all ${loc.pathname === "/app" ? "rounded-xl bg-primary text-primary-foreground" : "bg-sidebar-accent hover:rounded-xl hover:bg-primary hover:text-primary-foreground"}`}>P</Link>
        <div className="h-px w-8 bg-sidebar-border" />
        {myServers.map((s) => {
          const active = activeServerId === s.id;
          return (
            <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }} title={s.name}
              className={`relative grid place-items-center h-12 w-12 overflow-hidden font-bold transition-all ${active ? "rounded-xl bg-primary text-primary-foreground" : "rounded-2xl bg-sidebar-accent hover:rounded-xl hover:bg-primary/80"}`}>
              {active && <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r" />}
              {s.icon_url
                ? <img src={s.icon_url} alt="" className="h-full w-full object-cover" />
                : <span>{s.name[0]?.toUpperCase()}</span>}
            </Link>
          );
        })}
        <Link to="/app/servers" className="grid place-items-center rounded-2xl bg-sidebar-accent text-primary h-12 w-12 hover:rounded-xl hover:bg-primary/15 transition-all" title="Nova panela / minhas">
          <Plus className="h-5 w-5" />
        </Link>
      </aside>

      {/* Sidebar de navegação */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="p-4 border-b border-sidebar-border"><PanelaLogo size={24} /></div>
        <nav className="flex-1 p-2 space-y-1 overflow-auto">
          {nav.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
            return (
              <Link key={it.to} to={it.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}>
                <it.icon className="h-4 w-4" />{it.label}
              </Link>
            );
          })}
          {isStaff(roles) && (
            <Link to="/app/admin"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${loc.pathname.startsWith("/app/admin") ? "bg-primary/15 text-primary" : "text-primary/80 hover:bg-primary/10"}`}>
              <Crown className="h-4 w-4" /> Painel Staff
            </Link>
          )}
        </nav>
        <div className="p-3 border-t border-sidebar-border flex items-center gap-2">
          <Avatar className="h-9 w-9"><AvatarImage src={profile?.avatar_url ?? undefined} /><AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium">{profile?.display_name || profile?.username}</div>
            <div className="truncate text-xs text-muted-foreground">@{profile?.username}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={async () => { await signOut(); router.navigate({ to: "/auth/login" }); }} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 min-h-0 overflow-auto">{children}</main>
    </div>
  );
}
