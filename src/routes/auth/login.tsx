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
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Entrar — PANELA" }, { name: "description", content: "Entre na PANELA" }] }),
  component: Login,
});

function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    router.navigate({ to: "/app" });
  }

  async function onGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (r.error) toast.error(String((r as any).error?.message ?? r.error));
  }

  return (
    <Card className="w-full max-w-sm p-6 space-y-5">
      <div className="flex justify-center"><PanelaLogo /></div>
      <h1 className="text-center text-xl font-semibold">Entrar na panela</h1>
      <Button variant="outline" className="w-full" onClick={onGoogle}>Continuar com Google</Button>
      <div className="relative text-center text-xs text-muted-foreground"><span className="bg-card px-2 relative z-10">ou com email</span><div className="absolute inset-x-0 top-1/2 h-px bg-border" /></div>
      <form onSubmit={onEmail} className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Entrar</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">Novo por aqui? <Link to="/auth/signup" className="text-primary hover:underline">Criar conta</Link></p>
    </Card>
  );
}
