import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/dms/")({
  component: DMsHome,
});

function DMsHome() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 p-6">
      <MessageSquare className="h-16 w-16 opacity-30" />
      <h2 className="text-xl font-semibold text-foreground/70">Mensagens Diretas</h2>
      <p className="text-sm text-center max-w-xs">
        Selecione uma conversa ao lado ou clique no perfil de alguém para iniciar uma conversa.
      </p>
      <Link to="/app/servers">
        <Button variant="outline">Ir para servidores</Button>
      </Link>
    </div>
  );
}
