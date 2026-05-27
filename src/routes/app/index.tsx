import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Sparkles, MessageCircle, Compass, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Início — PANELA" }] }),
  component: Home,
});

function Home() {
  const { profile, roles } = useAuth();
  if (!profile) return <div className="p-8 text-muted-foreground">Carregando perfil…</div>;
  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Bem-vindo de volta,</p>
        <h1 className="text-3xl font-bold mt-1"><UsernameBadge profile={profile} roles={roles} /></h1>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/10 to-gold/5 border-primary/20">
        <div className="flex items-start gap-4">
          <Sparkles className="h-6 w-6 text-gold mt-1" />
          <div className="flex-1">
            <h2 className="font-semibold">Você está no plano <span className="uppercase">{profile.current_plan}</span></h2>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.current_plan === "free"
                ? "Suba pro PRO para banner GIF, nome rainbow, bio rica e mais."
                : "Aproveite todos os recursos PRO — customize seu perfil ao máximo."}
            </p>
            <div className="mt-3 flex gap-2">
              <Link to="/app/profile"><Button size="sm" variant="outline">Editar perfil</Button></Link>
              {profile.current_plan === "free" && (
                <Link to="/app/plans"><Button size="sm">Quero ser PRO</Button></Link>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5"><Compass className="h-5 w-5 text-primary" /><h3 className="font-semibold mt-2">Descobrir servidores</h3><p className="text-sm text-muted-foreground mt-1">Em breve: lista pública com filtros por foco.</p></Card>
        <Card className="p-5"><MessageCircle className="h-5 w-5 text-primary" /><h3 className="font-semibold mt-2">Suas conversas</h3><p className="text-sm text-muted-foreground mt-1">Servidores e DMs aparecerão aqui na Fase 2.</p></Card>
        <Card className="p-5 sm:col-span-2"><Users className="h-5 w-5 text-primary" /><h3 className="font-semibold mt-2">Roadmap</h3><p className="text-sm text-muted-foreground mt-1">MVP → Beta (chat + chamadas) → Versão completa (LiveKit, push, moderação). Veja em <Link to="/app/settings" className="text-primary underline">Configurações</Link>.</p></Card>
      </div>
    </div>
  );
}
