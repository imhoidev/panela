import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PanelaLogo } from "@/components/PanelaLogo";
import { Card } from "@/components/ui/card";
import { Sparkles, MessageCircle, Users, Shield, Mic, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PANELA — comunidades com sabor de 2008, velocidade de 2026" },
      { name: "description", content: "Crie servidores, chame os amigos, converse em tempo real. PANELA junta a alma dos antigos fóruns com tecnologia moderna." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
        <PanelaLogo />
        <nav className="flex items-center gap-2">
          <Link to="/auth/login"><Button variant="ghost">Entrar</Button></Link>
          <Link to="/auth/signup"><Button>Criar conta</Button></Link>
        </nav>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
          <Sparkles className="h-3 w-3" /> beta privado · vibe retrô-moderna
        </span>
        <h1 className="mt-6 font-bold tracking-tight text-5xl sm:text-7xl" style={{ fontFamily: "var(--font-display)" }}>
          Sua <span className="text-primary">panela</span>,<br/>do seu jeito.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Servidores, chamadas, eventos e chat em tempo real. O calor dos fóruns antigos com a tecnologia que você espera hoje.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to="/auth/signup"><Button size="lg" className="h-12 px-6">Começar grátis</Button></Link>
          <Link to="/auth/login"><Button size="lg" variant="outline" className="h-12 px-6">Já tenho conta</Button></Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { Icon: MessageCircle, t: "Chat em tempo real", d: "Markdown, reações, replies e threads. Sem latência, sem firula." },
          { Icon: Mic, t: "Voz, vídeo e tela", d: "Qualquer um inicia, todos entram. Mic ou câmera off no botão." },
          { Icon: Users, t: "Cargos granulares", d: "1 a 99 níveis, permissões por canal, hierarquia clara." },
          { Icon: Shield, t: "Moderação séria", d: "AutoMod, logs, reports e verificação de idade quando faz sentido." },
          { Icon: Calendar, t: "Eventos no calendário", d: "Organize encontros, lives, partidas e festivais dentro da panela." },
          { Icon: Sparkles, t: "PRO opcional", d: "Banner GIF, nome rainbow, bio rica, stickers exclusivos. Pagamento direto com a gente." },
        ].map(({ Icon, t, d }) => (
          <Card key={t} className="p-5">
            <Icon className="h-6 w-6 text-primary" />
            <h3 className="mt-3 font-semibold">{t}</h3>
            <p className="text-sm text-muted-foreground mt-1">{d}</p>
          </Card>
        ))}
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-6 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <PanelaLogo size={20} />
          <span>© {new Date().getFullYear()} PANELA</span>
        </div>
      </footer>
    </div>
  );
}
