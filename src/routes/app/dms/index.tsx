import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/dms/")({
  component: DMsHome,
});

function DMsHome() {
  return (
    <div className="flex h-full flex-col justify-center gap-6 p-6 text-muted-foreground md:items-center">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
        <MessageSquare className="h-16 w-16 text-primary/80" />
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Painel de conversas</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Use a lista ao lado para navegar rapidamente entre DMs e grupos. Toque rápido em qualquer conversa para visualizar as mensagens, ou abra um perfil para iniciar uma nova conversa.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/app/servers" className="rounded-3xl border border-border bg-background p-4 hover:border-primary transition-all">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Buscar membros</p>
              <p className="text-xs text-muted-foreground">Encontre pessoas e comece conversas em qualquer servidor.</p>
            </div>
            <ArrowRight className="h-5 w-5 text-primary" />
          </div>
        </Link>
        <Link to="/app/settings" className="rounded-3xl border border-border bg-background p-4 hover:border-primary transition-all">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Ajustes de chat</p>
              <p className="text-xs text-muted-foreground">Configure preferências de DMs, modo móvel e atalhos.</p>
            </div>
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
        </Link>
      </div>
      <div className="rounded-3xl border border-border bg-accent/40 p-4 text-sm text-foreground/90">
        <p className="font-semibold">Dica avançada</p>
        <p className="mt-2 text-muted-foreground">Use swipe ou toque prolongado no celular para abrir ações rápidas e responder mensagens sem perder o fluxo.</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="outline" asChild>
          <Link to="/app/servers">Explorar servidores</Link>
        </Button>
        <Button asChild>
          <Link to="/app/settings">Configurar chat</Link>
        </Button>
      </div>
    </div>
  );
}
