import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { StatusPicker, StatusDot } from "@/components/PresenceStatus";
import {
  User, Shield, Info, Check, Bell, BellOff, Loader2, Copy, LogOut, MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — PANELA" }] }),
  component: Settings,
});

function Settings() {
  const { user, profile, roles, signOut } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [statusText, setStatusText] = useState(profile?.status_text ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setStatusText(profile?.status_text ?? "");
  }, [profile]);

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      status_text: statusText.trim() || null,
    }).eq("id", user!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success("Perfil atualizado!");
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Profile quick edit */}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Perfil Rápido</h2>
        <div className="space-y-1.5">
          <Label>Nome de exibição</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={32} placeholder="Seu nome" />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Input value={statusText} onChange={(e) => setStatusText(e.target.value)} maxLength={80} placeholder="O que você está fazendo?" />
        </div>
        <Button onClick={saveProfile} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saving ? "Salvando..." : saved ? "Salvo!" : "Salvar perfil"}
        </Button>
        <Link to="/app/profile" className="block">
          <Button variant="outline" className="w-full mt-1">Perfil completo →</Button>
        </Link>
      </Card>

      {/* Presence Status */}
      <Card className="p-5 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><StatusDot status={profile?.status || "online"} size="lg" /> Presença</h2>
        <p className="text-sm text-muted-foreground">Sua disponibilidade atual aparece para todos nos servidores.</p>
        <StatusPicker currentStatus={profile?.status} />
      </Card>

      {/* Account */}
      <Card className="p-5 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Conta</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Email</p>
            <p>{user?.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Username</p>
            <p>@{profile?.username}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Plano</p>
            <Badge variant="outline" className="uppercase">{profile?.current_plan}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Cargos</p>
            <div className="flex gap-1 flex-wrap mt-0.5">
              {roles.length === 0 ? <Badge variant="outline">user</Badge> : roles.map((r) => <Badge key={r} variant={r === "ceo" ? "destructive" : "secondary"}>{r}</Badge>)}
            </div>
          </div>
        </div>
        <div className="pt-2 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={async () => { if (!user) return; await navigator.clipboard.writeText(user.id); toast.success("ID copiado!"); }} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copiar ID
          </Button>
          <Button variant="destructive" size="sm" onClick={signOut} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </Button>
        </div>
      </Card>

      {/* Direct Messages Info */}
      <Card className="p-5 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Mensagens Diretas</h2>
        <p className="text-sm text-muted-foreground">Inicie conversas privadas com outros membros clicando em "Mensagem" no perfil deles.</p>
        <Link to="/app/dms">
          <Button variant="outline" size="sm" className="gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Ver mensagens</Button>
        </Link>
      </Card>

      <PushNotificationsCard />

      <Card className="p-5 space-y-2">
        <h2 className="font-semibold flex items-center gap-2"><Info className="h-4 w-4 text-primary" /> Sobre o PANELA</h2>
        <p className="text-sm text-muted-foreground">PANELA é uma plataforma social de comunidades com sabor de fórum 2008 e velocidade de 2026. Versão 3.0 — com DMs, temas, cargos, eventos e muito mais.</p>
        <div className="text-xs text-muted-foreground/60 pt-1">
          <profile className="italic">Feito com 🧑‍🍳 e ☕ em São Paulo</profile>
          <p>Desenvolvido por <a href="https://instagram.com/breyky" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Breyky</a></p>
        </div>
      </Card>
    </div>
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)));
}

async function subscribePush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY || ""),
  });
  return sub;
}

function PushNotificationsCard() {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setLoading(false); return; }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      setSubscribed(!!sub);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggle() {
    if (!user) return;
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (subscribed) {
      const sub = await navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription());
      if (sub) {
        await sub.unsubscribe();
        await fetch(`${apiUrl}/api/push/unsubscribe`, {
          method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setSubscribed(false);
      toast.success("Notificações desativadas");
    } else {
      const sub = await subscribePush();
      if (!sub) { toast.error("Push não suportado"); return; }
      const res = await fetch(`${apiUrl}/api/push/subscribe`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "Erro ao ativar notificações"); return; }
      setSubscribed(true);
      toast.success("Notificações ativadas!");
    }
  }

  return (
    <Card className="p-5 space-y-2">
      <h2 className="font-semibold">Notificações Push</h2>
      <p className="text-sm text-muted-foreground">Receba notificações mesmo com o PANELA fechado.</p>
      <Button variant={subscribed ? "outline" : "default"} disabled={loading} onClick={toggle}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : subscribed ? <BellOff className="h-4 w-4 mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
        {subscribed ? "Desativar notificações" : "Ativar notificações"}
      </Button>
    </Card>
  );
}
