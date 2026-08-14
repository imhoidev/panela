import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PanelaLogo } from "@/components/PanelaLogo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Entrar — PANELA" }, { name: "description", content: "Entre na PANELA" }] }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta à PANELA!");
    router.navigate({ to: "/app" });
  }

  async function onGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (r.error) toast.error(String((r as any).error?.message ?? r.error));
  }

  return (
    <Card className="w-full max-w-sm p-6 sm:p-8 space-y-6 border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 rounded-2xl relative overflow-hidden">
      <div className="absolute -top-12 -right-12 h-32 w-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col items-center space-y-2 text-center">
        <PanelaLogo size={36} />
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Entrar na PANELA</h1>
        <p className="text-xs text-muted-foreground">Sua plataforma de comunidades modernas</p>
      </div>

      <Button variant="outline" className="w-full h-10 gap-2 border-border/80 hover:bg-accent/60 transition-colors" onClick={onGoogle}>
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        Continuar com Google
      </Button>

      <div className="relative text-center text-xs text-muted-foreground">
        <span className="bg-card px-3 relative z-10 font-medium">ou com email</span>
        <div className="absolute inset-x-0 top-1/2 h-px bg-border/60" />
      </div>

      <form onSubmit={onEmail} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">Email</Label>
          <Input id="email" type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm bg-background/50" />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw" className="text-xs font-medium">Senha</Label>
          </div>
          <div className="relative">
            <Input id="pw" type={showPw ? "text" : "password"} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10 text-sm bg-background/50" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-10 font-semibold text-sm shadow-md shadow-primary/20" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Entrar"}
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
        Novo por aqui?{" "}
        <Link to="/auth/signup" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
          Criar conta <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </Card>
  );
}
