import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — PANELA" }] }),
  component: Settings,
});

function Settings() {
  const { user, profile, roles, signOut } = useAuth();

  async function copyId() {
    if (!user) return;
    await navigator.clipboard.writeText(user.id);
    toast.success("ID copiado");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <Card className="p-5 space-y-2">
        <h2 className="font-semibold">Conta</h2>
        <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
        <p className="text-sm text-muted-foreground">Username: @{profile?.username}</p>
        <p className="text-sm text-muted-foreground">Plano: <span className="uppercase">{profile?.current_plan}</span></p>
        <div className="text-sm flex items-center gap-2 flex-wrap">Cargos:
          {roles.length === 0 ? <Badge variant="outline">user</Badge> : roles.map((r) => <Badge key={r} variant={r === "ceo" ? "destructive" : "secondary"}>{r}</Badge>)}
        </div>
        <div className="pt-2 flex gap-2">
          <Button variant="outline" onClick={copyId}>Copiar meu ID</Button>
          <Button variant="destructive" onClick={signOut}>Sair</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="font-semibold">Roadmap</h2>
        <ol className="text-sm space-y-1 list-decimal pl-5 text-muted-foreground">
          <li><b className="text-foreground">MVP (agora):</b> Auth, perfis, cargos globais, planos PRO manuais.</li>
          <li><b className="text-foreground">Fase 2:</b> Servidores, canais, cargos internos, descoberta.</li>
          <li><b className="text-foreground">Fase 3:</b> Chat realtime, reações, threads, stickers.</li>
          <li><b className="text-foreground">Fase 4:</b> Voz/vídeo/screen-share via LiveKit, chamadas em grupo.</li>
          <li><b className="text-foreground">Fase 5:</b> Push notifications (VAPID), AutoMod, eventos, PWA completo.</li>
        </ol>
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="font-semibold">Sobre o PANELA</h2>
        <p className="text-sm text-muted-foreground">PANELA é uma plataforma social de comunidades com sabor de fórum 2008 e velocidade de 2026. Construído com carinho.</p>
      </Card>
    </div>
  );
}
