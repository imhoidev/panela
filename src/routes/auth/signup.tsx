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

export const Route = createFileRoute("/auth/signup")({
  head: () => ({ meta: [{ title: "Criar conta — PANELA" }, { name: "description", content: "Crie sua conta gratuita na PANELA" }] }),
  component: Signup,
});

function Signup() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-z0-9_]{3,20}$/i.test(username)) return toast.error("Username: 3-20 caracteres, letras/números/_.");
    if (password.length < 8) return toast.error("Senha precisa ter pelo menos 8 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: { username: username.toLowerCase(), display_name: username },
        emailRedirectTo: window.location.origin + "/app",
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu email para confirmar.");
    router.navigate({ to: "/auth/login" });
  }

  async function onGoogle() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
    if (r.error) toast.error(String((r as any).error?.message ?? r.error));
  }

  return (
    <Card className="w-full max-w-sm p-6 space-y-5">
      <div className="flex justify-center"><PanelaLogo /></div>
      <h1 className="text-center text-xl font-semibold">Junte-se à panela</h1>
      <Button variant="outline" className="w-full" onClick={onGoogle}>Continuar com Google</Button>
      <div className="relative text-center text-xs text-muted-foreground"><span className="bg-card px-2 relative z-10">ou com email</span><div className="absolute inset-x-0 top-1/2 h-px bg-border" /></div>
      <form onSubmit={onEmail} className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="u">Username</Label><Input id="u" required value={username} onChange={(e) => setUsername(e.target.value)} placeholder="seunome" /></div>
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="pw">Senha (mín. 8)</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Criar conta</Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">Já tem conta? <Link to="/auth/login" className="text-primary hover:underline">Entrar</Link></p>
    </Card>
  );
}
