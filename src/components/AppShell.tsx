import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useAuth, isStaff } from "@/hooks/use-auth";
import { PanelaLogo } from "./PanelaLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { StatusPicker } from "./PresenceStatus";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home, Users, Settings, Crown, LogOut, Sparkles, Compass, Plus, Hash, Menu, Search,
  MessageSquare, Bell, Circle,
} from "lucide-react";
import { useEffect, useState, type ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ServerLite = { id: string; name: string; icon_url: string | null };

const NAV = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/servers", label: "Panelas", icon: Hash },
  { to: "/app/dms", label: "DMs", icon: MessageSquare },
  { to: "/app/discover", label: "Descobrir", icon: Compass },
  { to: "/app/profile", label: "Perfil", icon: Users },
  { to: "/app/plans", label: "Planos", icon: Sparkles },
  { to: "/app/settings", label: "Ajustes", icon: Settings },
] as const;

const BOTTOM_NAV = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/servers", label: "Panelas", icon: Hash },
  { to: "/app/dms", label: "DMs", icon: MessageSquare },
  { to: "/app/discover", label: "+", icon: Compass },
  { to: "/app/settings", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const router = useRouter();
  const loc = useLocation();
  const [myServers, setMyServers] = useState<ServerLite[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadServers = useCallback(async () => {
    if (!user) return;
    const { data: mem } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
    const ids = (mem ?? []).map((m) => m.server_id);
    if (!ids.length) { setMyServers([]); setLoading(false); return; }
    const { data } = await supabase.from("servers").select("id,name,icon_url").in("id", ids);
    setMyServers(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadServers();
    const ch = supabase
      .channel(`my-servers-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, loadServers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, loadServers]);

  useEffect(() => { setMobileOpen(false); }, [loc.pathname]);

  if (!user) return <div className="min-h-screen">{children}</div>;

  const activeServerId = loc.pathname.startsWith("/app/servers/") ? loc.pathname.split("/")[3] : null;
  const inServer = !!activeServerId;
  const hideBottomNav = loc.pathname.match(/^\/app\/servers\/[^/]+\/[^/]+$/) || loc.pathname.match(/^\/app\/dms\/[^/]+$/);

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-background text-foreground">
      <ServersRail myServers={myServers} activeServerId={activeServerId} loc={loc} loading={loading} />

      <aside className="hidden lg:flex w-60 flex-col border-r border-border bg-sidebar">
        <NavBlock profile={profile} roles={roles} loc={loc} onSignOut={async () => { await signOut(); router.navigate({ to: "/auth/login" }); }} />
      </aside>

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="lg:hidden flex items-center gap-2 h-12 px-2 border-b border-border bg-sidebar/95 backdrop-blur pt-safe shrink-0 z-20">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-[320px] bg-sidebar flex flex-col">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
                <SheetDescription>Navegação principal e suas panelas.</SheetDescription>
              </SheetHeader>
              <div className="flex h-full min-h-0">
                <div className="w-[60px] border-r border-sidebar-border bg-sidebar/60 py-2 overflow-y-auto shrink-0">
                  <ServersRailInner myServers={myServers} activeServerId={activeServerId} loc={loc} compact loading={loading} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <NavBlock profile={profile} roles={roles} loc={loc} onSignOut={async () => { await signOut(); router.navigate({ to: "/auth/login" }); }} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/app" className="flex-1 min-w-0 truncate flex items-center">
            <PanelaLogo size={20} />
          </Link>
          <Button size="icon" variant="ghost" className="h-9 w-9" asChild>
            <Link to="/app/discover"><Search className="h-5 w-5" /></Link>
          </Button>
        </header>

        <main className="flex-1 min-w-0 min-h-0 overflow-auto overscroll-contain pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
          {children}
        </main>

        {!hideBottomNav && (
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-sidebar/95 backdrop-blur pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/40">
            <ul className="grid grid-cols-5 h-14">
              {BOTTOM_NAV.map((it) => {
                const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
                return (
                  <li key={it.to}>
                    <Link to={it.to} className={`flex flex-col items-center justify-center h-full text-[10px] gap-0.5 transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                      <it.icon className={`h-5 w-5 ${active ? "fill-primary/10" : ""}`} />
                      <span>{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}

function NavBlock({
  profile, roles, loc, onSignOut,
}: { profile: any; roles: any[]; loc: ReturnType<typeof useLocation>; onSignOut: () => void }) {
  return (
    <>
      <div className="p-4 border-b border-sidebar-border hidden lg:flex"><PanelaLogo size={24} /></div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-auto">
        {NAV.map((it) => {
          const active = loc.pathname === it.to || (it.to !== "/app" && loc.pathname.startsWith(it.to));
          return (
            <Link key={it.to} to={it.to}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}>
              <it.icon className="h-4 w-4" />{it.label}
            </Link>
          );
        })}
        {isStaff(roles) && (
          <Link to="/app/admin"
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
              loc.pathname.startsWith("/app/admin") ? "bg-primary/15 text-primary font-medium" : "text-primary/80 hover:bg-primary/10"
            }`}>
            <Crown className="h-4 w-4" /> Painel Staff
          </Link>
        )}
      </nav>
      <Link to={{ to: "/app/u/$slug", params: { slug: profile?.username ?? "" } } as any}
        className="p-3 border-t border-sidebar-border flex items-center gap-2 min-h-[3.5rem] hover:bg-sidebar-accent/40 transition-colors">
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-medium">{profile?.display_name || profile?.username}</span>
            <StatusPicker currentStatus={profile?.status} />
          </div>
          <div className="truncate text-xs text-muted-foreground">@{profile?.username}</div>
        </div>
        <Button size="icon" variant="ghost" onClick={(e: any) => { e.preventDefault(); onSignOut(); }} title="Sair" className="h-8 w-8 shrink-0">
          <LogOut className="h-4 w-4" />
        </Button>
      </Link>
    </>
  );
}

function ServersRail({ myServers, activeServerId, loc, loading }: { myServers: ServerLite[]; activeServerId: string | null; loc: ReturnType<typeof useLocation>; loading: boolean }) {
  return (
    <aside className="hidden md:flex w-[72px] flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3 overflow-y-auto">
      <ServersRailInner myServers={myServers} activeServerId={activeServerId} loc={loc} loading={loading} />
    </aside>
  );
}

function ServerIcon({ s, active, size }: { s: ServerLite; active: boolean; size: string }) {
  return (
    <div className={`relative grid place-items-center overflow-hidden font-bold transition-all duration-300 ${size} ${
      active ? "rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "rounded-2xl bg-sidebar-accent/70 hover:rounded-xl hover:bg-primary/80 text-muted-foreground hover:text-primary-foreground"
    }`}>
      {active && <span className="absolute -left-2.5 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r shadow-sm shadow-primary/40" />}
      {s.icon_url ? (
        <img src={s.icon_url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={size === "h-10 w-10" ? "text-sm" : "text-base"}>{s.name[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}

function ServersRailInner({
  myServers, activeServerId, loc, compact, loading,
}: { myServers: ServerLite[]; activeServerId: string | null; loc: ReturnType<typeof useLocation>; compact?: boolean; loading?: boolean }) {
  const size = compact ? "h-10 w-10" : "h-12 w-12";
  const homeActive = loc.pathname === "/app";
  return (
    <TooltipProvider delayDuration={0}>
    <div className="flex flex-col items-center gap-2 w-full">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/app"
            className={`grid place-items-center font-bold transition-all duration-300 ${size} ${
              homeActive
                ? "rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "rounded-2xl bg-sidebar-accent/70 hover:rounded-xl hover:bg-primary/80 text-muted-foreground hover:text-primary-foreground"
            }`}>
            <span className={compact ? "text-sm" : "text-base"}>P</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Início</TooltipContent>
      </Tooltip>

      <div className="h-px w-8 bg-sidebar-border" />

      {loading ? (
        <>
          {[1, 2, 3].map((i) => (
            <div key={i} className={`${size} rounded-2xl bg-sidebar-accent/30 animate-pulse`} />
          ))}
        </>
      ) : (
        myServers.map((s) => {
          const active = activeServerId === s.id;
          return (
            <Tooltip key={s.id}>
              <TooltipTrigger asChild>
                <Link to="/app/servers/$serverId" params={{ serverId: s.id }}>
                  <ServerIcon s={s} active={active} size={size} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs font-medium" sideOffset={8}>
                <div className="flex items-center gap-1.5">
                  {s.name}
                  {active && <Circle className="h-1.5 w-1.5 fill-primary" />}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Link to="/app/servers"
            className={`grid place-items-center rounded-2xl bg-sidebar-accent/70 text-primary hover:rounded-xl hover:bg-primary/20 hover:text-primary transition-all duration-300 ${size}`}>
            <Plus className="h-5 w-5" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Nova panela</TooltipContent>
      </Tooltip>
    </div>
    </TooltipProvider>
  );
}
