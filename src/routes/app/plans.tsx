import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/plans")({
  head: () => ({ meta: [{ title: "Planos — PANELA" }] }),
  component: PlansPage,
});

type Sub = { id: string; status: string; plan: string; created_at: string; notes: string | null };

function PlansPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [latest, setLatest] = useState<Sub | null>(null);
  const [open, setOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState("whatsapp");
  const [contactValue, setContactValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (user) loadLatest(); }, [user]);
  async function loadLatest() {
    if (!user) return;
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
    setLatest((data?.[0] as Sub) ?? null);
  }

  const activeSubscription = latest?.status === "active" ? latest : null;

  async function requestPro() {
    if (!user || !contactValue.trim()) return toast.error("Informe seu contato.");
    setSubmitting(true);
    const { error } = await supabase.from("subscriptions").insert({
      user_id: user.id, plan: "pro", status: "pending",
      contact_method: contactMethod, contact_value: contactValue.trim(), notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado! O CEO vai te chamar.");
    setOpen(false); setContactValue(""); setNotes(""); loadLatest(); refreshProfile();
  }

  const proFeatures = [
    "Banner no perfil (estático ou GIF)",
    "Nome com cor única, gradiente (até 5 cores) e efeitos (glow, rainbow, typing)",
    "Bio rica até 1000 caracteres",
    "Tag PRO + stickers exclusivos",
    "Customização do balão de mensagem",
    "Avatar/banner em GIF",
    "Upload de arquivos até 100MB",
    "Prioridade em filas de voz",
    "Emoji pessoal customizado",
    "Histórico de mensagens estendido",
    "Tema escuro/claro por servidor",
  ];
  const freeFeatures = [
    "Perfil básico (avatar estático, bio simples)",
    "Até 5 servidores/grupos",
    "Chat e chamadas",
    "Reações e replies",
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-muted-foreground text-sm">Pagamento manual via contato direto com o CEO. Sem cartão, sem boleto automático — fala com a gente.</p>
      </header>

      {activeSubscription && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <p className="text-sm"><Badge className="bg-primary text-background mr-2">PRO ativo</Badge>Seu plano PRO está ativo até <strong>{activeSubscription.ends_at ? new Date(activeSubscription.ends_at).toLocaleDateString("pt-BR") : "data indefinida"}</strong>.</p>
        </Card>
      )}
      {latest && latest.status === "pending" && (
        <Card className="p-4 border-gold/30 bg-gold/5">
          <p className="text-sm"><Badge className="bg-gold text-background mr-2">Pendente</Badge>Seu pedido PRO foi enviado. Aguarde contato.</p>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-6 space-y-3">
          <h2 className="font-semibold text-lg">FREE</h2>
          <p className="text-3xl font-bold">R$ 0</p>
          <ul className="space-y-1.5 text-sm">
            {freeFeatures.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />{f}</li>)}
          </ul>
          {profile?.current_plan === "free" && <Badge variant="outline">Plano atual</Badge>}
        </Card>

        <Card className="p-6 space-y-3 border-primary/40 bg-primary/5 relative">
          <div className="absolute top-4 right-4"><Badge className="bg-gold text-background"><Sparkles className="h-3 w-3 mr-1" />Recomendado</Badge></div>
          <h2 className="font-semibold text-lg flex items-center gap-2">PRO</h2>
          <p className="text-3xl font-bold">A combinar</p>
          <ul className="space-y-1.5 text-sm">
            {proFeatures.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-gold mt-0.5 shrink-0" />{f}</li>)}
          </ul>
          {profile?.current_plan === "pro" ? (
            <Badge className="bg-primary">Plano atual</Badge>
          ) : !open ? (
            <Button className="w-full" onClick={() => setOpen(true)} disabled={latest?.status === "pending"}>
              {latest?.status === "pending" ? "Pedido pendente" : "Quero ser PRO"}
            </Button>
          ) : (
            <div className="space-y-3 pt-2 border-t border-primary/20">
              <div className="space-y-1.5"><Label>Como prefere ser contactado?</Label>
                <Select value={contactMethod} onValueChange={setContactMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="discord">Discord</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Seu contato</Label><Input value={contactValue} onChange={(e) => setContactValue(e.target.value)} placeholder="+55 11 9..." /></div>
              <div className="space-y-1.5"><Label>Observações (opcional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
              <div className="flex gap-2">
                <Button onClick={requestPro} disabled={submitting} className="flex-1">{submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Enviar pedido</Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
