import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Sparkles, Hash, Compass, Users } from "lucide-react";
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
              {profile.current_plan === "free" && <Link to="/app/plans"><Button size="sm">Quero ser PRO</Button></Link>}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/app/servers"><Card className="p-5 hover:border-primary/50 transition-colors h-full"><Hash className="h-5 w-5 text-primary" /><h3 className="font-semibold mt-2">Meus servidores</h3><p className="text-sm text-muted-foreground mt-1">Crie ou abra suas panelas pessoais.</p></Card></Link>
        <Link to="/app/discover"><Card className="p-5 hover:border-primary/50 transition-colors h-full"><Compass className="h-5 w-5 text-primary" /><h3 className="font-semibold mt-2">Descobrir</h3><p className="text-sm text-muted-foreground mt-1">Comunidades públicas pra entrar agora.</p></Card></Link>
        <Link to="/app/profile" className="sm:col-span-2"><Card className="p-5 hover:border-primary/50 transition-colors"><Users className="h-5 w-5 text-primary" /><h3 className="font-semibold mt-2">Personalize seu perfil</h3><p className="text-sm text-muted-foreground mt-1">Cor do nome, status, banner, redes — capricha que o pessoal vê.</p></Card></Link>
      </div>
    </div>
  );
}
