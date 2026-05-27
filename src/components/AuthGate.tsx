import { useEffect, type ReactNode } from "react";
import { useRouter, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { PanelaLogo } from "./PanelaLogo";

/**
 * Guard 100% client-side. Renderiza skeleton até `ready` ser true e só
 * então decide. Evita o "loop de SSR redireciona pro /auth/login".
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const loc = useLocation();

  useEffect(() => {
    if (ready && !user) {
      const back = encodeURIComponent(loc.pathname + loc.search);
      router.navigate({ to: "/auth/login", search: { redirect: back } as never, replace: true });
    }
  }, [ready, user]);

  if (!ready || !user) return <FullScreenLoader label="Esquentando a panela…" />;
  return <>{children}</>;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { ready, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.navigate({ to: "/app", replace: true });
  }, [ready, user]);

  if (!ready) return <FullScreenLoader label="Carregando…" />;
  if (user) return <FullScreenLoader label="Entrando…" />;
  return <>{children}</>;
}

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="animate-pulse"><PanelaLogo size={40} /></div>
        <p className="text-xs text-muted-foreground">{label ?? "Carregando…"}</p>
      </div>
    </div>
  );
}
