import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { FullScreenLoader } from "@/components/AuthGate";

// O "site" é o app. Aqui só decidimos client-side pra evitar
// loops de SSR sem sessão.
export const Route = createFileRoute("/")({
  component: IndexGate,
});

function IndexGate() {
  const { ready, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.navigate({ to: user ? "/app" : "/auth/login", replace: true });
  }, [ready, user]);
  return <FullScreenLoader label="Abrindo a PANELA…" />;
}
