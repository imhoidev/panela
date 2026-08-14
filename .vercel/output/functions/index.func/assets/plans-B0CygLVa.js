import { jsxs, jsx } from "react/jsx-runtime";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import { useState, useEffect } from "react";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { T as Textarea } from "./textarea-F69quoCd.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { toast } from "sonner";
import { Check, Sparkles, Loader2 } from "lucide-react";
import "@tanstack/react-query";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "@radix-ui/react-select";
function PlansPage() {
  const {
    user,
    profile,
    refreshProfile
  } = useAuth();
  const [latest, setLatest] = useState(null);
  const [open, setOpen] = useState(false);
  const [contactMethod, setContactMethod] = useState("whatsapp");
  const [contactValue, setContactValue] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (user) loadLatest();
  }, [user]);
  async function loadLatest() {
    if (!user) return;
    const {
      data
    } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", {
      ascending: false
    }).limit(1);
    setLatest(data?.[0] ?? null);
  }
  const activeSubscription = latest?.status === "active" ? latest : null;
  async function requestPro() {
    if (!user || !contactValue.trim()) return toast.error("Informe seu contato.");
    setSubmitting(true);
    const {
      error
    } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan: "pro",
      status: "pending",
      contact_method: contactMethod,
      contact_value: contactValue.trim(),
      notes: notes.trim() || null
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Pedido enviado! O CEO vai te chamar.");
    setOpen(false);
    setContactValue("");
    setNotes("");
    loadLatest();
    refreshProfile();
  }
  const proFeatures = ["Banner no perfil (estático ou GIF)", "Nome com cor única, gradiente (até 5 cores) e efeitos (glow, rainbow, typing)", "Bio rica até 1000 caracteres", "Tag PRO + stickers exclusivos", "Customização do balão de mensagem", "Avatar/banner em GIF", "Upload de arquivos até 100MB", "Prioridade em filas de voz", "Emoji pessoal customizado", "Histórico de mensagens estendido", "Tema escuro/claro por servidor"];
  const freeFeatures = ["Perfil básico (avatar estático, bio simples)", "Até 5 servidores/grupos", "Chat e chamadas", "Reações e replies"];
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto p-6 md:p-10 space-y-6", children: [
    /* @__PURE__ */ jsxs("header", { children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Planos" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Pagamento manual via contato direto com o CEO. Sem cartão, sem boleto automático — fala com a gente." })
    ] }),
    activeSubscription && /* @__PURE__ */ jsx(Card, { className: "p-4 border-primary/30 bg-primary/5", children: /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
      /* @__PURE__ */ jsx(Badge, { className: "bg-primary text-background mr-2", children: "PRO ativo" }),
      "Seu plano PRO está ativo até ",
      /* @__PURE__ */ jsx("strong", { children: activeSubscription.ends_at ? new Date(activeSubscription.ends_at).toLocaleDateString("pt-BR") : "data indefinida" }),
      "."
    ] }) }),
    latest && latest.status === "pending" && /* @__PURE__ */ jsx(Card, { className: "p-4 border-gold/30 bg-gold/5", children: /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
      /* @__PURE__ */ jsx(Badge, { className: "bg-gold text-background mr-2", children: "Pendente" }),
      "Seu pedido PRO foi enviado. Aguarde contato."
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ jsxs(Card, { className: "p-6 space-y-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-semibold text-lg", children: "FREE" }),
        /* @__PURE__ */ jsx("p", { className: "text-3xl font-bold", children: "R$ 0" }),
        /* @__PURE__ */ jsx("ul", { className: "space-y-1.5 text-sm", children: freeFeatures.map((f) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 text-primary mt-0.5 shrink-0" }),
          f
        ] }, f)) }),
        profile?.current_plan === "free" && /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "Plano atual" })
      ] }),
      /* @__PURE__ */ jsxs(Card, { className: "p-6 space-y-3 border-primary/40 bg-primary/5 relative", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute top-4 right-4", children: /* @__PURE__ */ jsxs(Badge, { className: "bg-gold text-background", children: [
          /* @__PURE__ */ jsx(Sparkles, { className: "h-3 w-3 mr-1" }),
          "Recomendado"
        ] }) }),
        /* @__PURE__ */ jsx("h2", { className: "font-semibold text-lg flex items-center gap-2", children: "PRO" }),
        /* @__PURE__ */ jsx("p", { className: "text-3xl font-bold", children: "A combinar" }),
        /* @__PURE__ */ jsx("ul", { className: "space-y-1.5 text-sm", children: proFeatures.map((f) => /* @__PURE__ */ jsxs("li", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 text-gold mt-0.5 shrink-0" }),
          f
        ] }, f)) }),
        profile?.current_plan === "pro" ? /* @__PURE__ */ jsx(Badge, { className: "bg-primary", children: "Plano atual" }) : !open ? /* @__PURE__ */ jsx(Button, { className: "w-full", onClick: () => setOpen(true), disabled: latest?.status === "pending", children: latest?.status === "pending" ? "Pedido pendente" : "Quero ser PRO" }) : /* @__PURE__ */ jsxs("div", { className: "space-y-3 pt-2 border-t border-primary/20", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Como prefere ser contactado?" }),
            /* @__PURE__ */ jsxs(Select, { value: contactMethod, onValueChange: setContactMethod, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "whatsapp", children: "WhatsApp" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "email", children: "Email" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "discord", children: "Discord" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Seu contato" }),
            /* @__PURE__ */ jsx(Input, { value: contactValue, onChange: (e) => setContactValue(e.target.value), placeholder: "+55 11 9..." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Observações (opcional)" }),
            /* @__PURE__ */ jsx(Textarea, { rows: 2, value: notes, onChange: (e) => setNotes(e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxs(Button, { onClick: requestPro, disabled: submitting, className: "flex-1", children: [
              submitting && /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }),
              "Enviar pedido"
            ] }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", onClick: () => setOpen(false), children: "Cancelar" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  PlansPage as component
};
