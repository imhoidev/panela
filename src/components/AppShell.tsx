import { Link, useRouter, useLocation } from "@tanstack/react-router";
import { useAuth, isStaff } from "@/hooks/use-auth";
import { PanelaLogo } from "./PanelaLogo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Home, Users, Settings, Crown, LogOut, Sparkles, Compass } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, roles, signOut } = useAuth();
  const router = useRouter();
  const loc = useLocation();

  if (!user) {
    // visitante: layout simples
    return <div className="min-h-screen">{children}</div>;
  }

  const nav = [
    { to: "/app", label: "Início", icon: Home },
    { to: "/app/discover", label: "Descobrir", icon: Compass },
    { to: "/app/profile", label: "Meu Perfil", icon: Users },
    { to: "/app/plans", label: "Planos", icon: Sparkles },
    { to: "/app/settings", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar de servidores (placeholder até fase 2) */}
      <aside className="hidden md:flex w-[72px] flex-col items-center gap-3 border-r border-sidebar-border bg-sidebar py-4">
        <Link to="/app" className="grid place-items-center rounded-2xl bg-primary text-primary-foreground h-12 w-12 font-bold hover:rounded-xl transition-all">P</Link>
        <div className="h-px w-8 bg-sidebar-border" />
        <div className="grid place-items-center rounded-2xl bg-sidebar-accent text-muted-foreground h-12 w-12 text-xs hover:rounded-xl hover:bg-primary hover:text-primary-foreground transition-all cursor-not-allowed" title="Criar servidor (em breve)">+</div>
      </aside>

      {/* Sidebar de navegação */}
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <PanelaLogo size={24} />
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map((it) => {
            const active = loc.pathname === it.to;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
          {isStaff(roles) && (
            <Link
              to="/app/admin"
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                loc.pathname.startsWith("/app/admin") ? "bg-primary/15 text-primary" : "text-primary/80 hover:bg-primary/10"
              }`}
            >
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
          <Button size="icon" variant="ghost" onClick={async () => { await signOut(); router.navigate({ to: "/" }); }} title="Sair">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
