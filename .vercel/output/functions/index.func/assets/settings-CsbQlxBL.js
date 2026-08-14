import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { u as useAuth, s as supabase } from "./router-mRNo7IUv.js";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { S as Switch } from "./switch-DkA5ZPe7.js";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { S as StatusDot, a as StatusPicker } from "./PresenceStatus-ChFY-wJ7.js";
import { User, Loader2, Check, Shield, Copy, LogOut, MessageSquare, Info, Bell } from "lucide-react";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "@radix-ui/react-select";
import "@radix-ui/react-switch";
import "./useRealtime-Cqf46s7E.js";
import "socket.io-client";
import "@radix-ui/react-dropdown-menu";
function Settings() {
  const {
    user,
    profile,
    roles,
    signOut
  } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [statusText, setStatusText] = useState(profile?.status_text ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sendMode, setSendMode] = useState("enter");
  const [mobileGestures, setMobileGestures] = useState(false);
  const [compactChats, setCompactChats] = useState(false);
  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setStatusText(profile?.status_text ?? "");
  }, [profile]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSendMode(localStorage.getItem("panela:dmSendMode") || "enter");
    setMobileGestures(localStorage.getItem("panela:dmMobileGestures") === "true");
    setCompactChats(localStorage.getItem("panela:dmCompactChats") === "true");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("panela:dmSendMode", sendMode);
  }, [sendMode]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("panela:dmMobileGestures", String(mobileGestures));
  }, [mobileGestures]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("panela:dmCompactChats", String(compactChats));
  }, [compactChats]);
  async function saveProfile() {
    setSaving(true);
    const {
      error
    } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      status_text: statusText.trim() || null
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    setSaved(true);
    setTimeout(() => setSaved(false), 2e3);
    toast.success("Perfil atualizado!");
  }
  return /* @__PURE__ */ jsxs("div", { className: "max-w-3xl mx-auto p-4 md:p-8 space-y-5", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Configurações" }),
    /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-3", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(User, { className: "h-4 w-4 text-primary" }),
        " Perfil Rápido"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Nome de exibição" }),
        /* @__PURE__ */ jsx(Input, { value: displayName, onChange: (e) => setDisplayName(e.target.value), maxLength: 32, placeholder: "Seu nome" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Status" }),
        /* @__PURE__ */ jsx(Input, { value: statusText, onChange: (e) => setStatusText(e.target.value), maxLength: 80, placeholder: "O que você está fazendo?" })
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: saveProfile, disabled: saving, className: "gap-1.5", children: [
        saving ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : saved ? /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) : null,
        saving ? "Salvando..." : saved ? "Salvo!" : "Salvar perfil"
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/app/profile", className: "block", children: /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full mt-1", children: "Perfil completo →" }) })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-2", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(StatusDot, { status: profile?.status || "online", size: "lg" }),
        " Presença"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Sua disponibilidade atual aparece para todos nos servidores." }),
      /* @__PURE__ */ jsx(StatusPicker, { currentStatus: profile?.status })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-2", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4 text-primary" }),
        " Conta"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3 text-sm", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: "Email" }),
          /* @__PURE__ */ jsx("p", { children: user?.email })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: "Username" }),
          /* @__PURE__ */ jsxs("p", { children: [
            "@",
            profile?.username
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: "Plano" }),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "uppercase", children: profile?.current_plan })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs", children: "Cargos" }),
          /* @__PURE__ */ jsx("div", { className: "flex gap-1 flex-wrap mt-0.5", children: roles.length === 0 ? /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "user" }) : roles.map((r) => /* @__PURE__ */ jsx(Badge, { variant: r === "ceo" ? "destructive" : "secondary", children: r }, r)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "pt-2 flex flex-wrap gap-2", children: [
        /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", onClick: async () => {
          if (!user) return;
          await navigator.clipboard.writeText(user.id);
          toast.success("ID copiado!");
        }, className: "gap-1.5", children: [
          /* @__PURE__ */ jsx(Copy, { className: "h-3.5 w-3.5" }),
          " Copiar ID"
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", onClick: signOut, className: "gap-1.5", children: [
          /* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
          " Sair"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
            /* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4 text-primary" }),
            " Preferências de chat"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Ajuste o comportamento do bate-papo, o modo móvel e a visão compacta das DMs." })
        ] }),
        /* @__PURE__ */ jsx(Badge, { variant: "outline", children: "Avançado" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Enviar com" }),
          /* @__PURE__ */ jsxs(Select, { value: sendMode, onValueChange: (v) => setSendMode(v), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "w-full h-9 text-sm", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "enter", children: "Enter para enviar" }),
              /* @__PURE__ */ jsx(SelectItem, { value: "ctrlEnter", children: "Ctrl + Enter para enviar" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Defina como você prefere enviar mensagens no chat." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Interface móvel" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-border p-3", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Gestos e atalhos" }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Botões de ação adaptados para celular." })
            ] }),
            /* @__PURE__ */ jsx(Switch, { checked: mobileGestures, onCheckedChange: setMobileGestures })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-2 sm:col-span-2", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-2xl border border-border p-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Modo compacto" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Mensagens mais densas com foco no conteúdo." })
          ] }),
          /* @__PURE__ */ jsx(Switch, { checked: compactChats, onCheckedChange: setCompactChats })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary-foreground", children: [
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Dica de chat" }),
        /* @__PURE__ */ jsx("p", { className: "mt-1 text-xs text-primary-foreground/90", children: "Use o modo móvel para ativar pontos de toque maiores e interações rápidas. O modo compacto economiza espaço, ideal para conversas longas e telas menores." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-2", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4 text-primary" }),
        " Mensagens Diretas"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: 'Inicie conversas privadas com outros membros clicando em "Mensagem" no perfil deles.' }),
      /* @__PURE__ */ jsx(Link, { to: "/app/dms", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "gap-1.5", children: [
        /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5" }),
        " Ver mensagens"
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(PushNotificationsCard, {}),
    /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-2", children: [
      /* @__PURE__ */ jsxs("h2", { className: "font-semibold flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Info, { className: "h-4 w-4 text-primary" }),
        " Sobre o PANELA"
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "PANELA é uma plataforma social de comunidades com sabor de fórum 2008 e velocidade de 2026. Versão 3.0 — com DMs, temas, cargos, eventos e muito mais." }),
      /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground/60 pt-1", children: [
        /* @__PURE__ */ jsx("p", { className: "italic", children: "Feito com 🧑‍🍳 e ☕ em São Paulo" }),
        /* @__PURE__ */ jsxs("p", { children: [
          "Desenvolvido por ",
          /* @__PURE__ */ jsx("a", { href: "https://instagram.com/breyky", target: "_blank", rel: "noopener noreferrer", className: "underline hover:text-primary", children: "Breyky" })
        ] })
      ] })
    ] })
  ] });
}
function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)));
}
async function subscribePush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array("")
  });
  return sub;
}
function PushNotificationsCard() {
  const {
    user
  } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setLoading(false);
      return;
    }
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => {
      setSubscribed(!!sub);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  async function toggle() {
    if (!user) return;
    const apiUrl = "";
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (subscribed) {
      const sub = await navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription());
      if (sub) {
        await sub.unsubscribe();
        await fetch(`${apiUrl}/api/push/unsubscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            endpoint: sub.endpoint
          })
        });
      }
      setSubscribed(false);
      toast.success("Notificações desativadas");
    } else {
      const sub = await subscribePush();
      if (!sub) {
        toast.error("Push não suportado");
        return;
      }
      const res = await fetch(`${apiUrl}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          subscription: sub.toJSON()
        })
      });
      if (!res.ok) {
        const e = await res.json();
        toast.error(e.error || "Erro ao ativar notificações");
        return;
      }
      setSubscribed(true);
      toast.success("Notificações ativadas!");
    }
  }
  return /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-2", children: [
    /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Notificações Push" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Receba notificações mesmo com o PANELA fechado." }),
    /* @__PURE__ */ jsxs(Button, { variant: subscribed ? "outline" : "default", disabled: loading, onClick: toggle, children: [
      loading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin mr-1" }) : /* @__PURE__ */ jsx(Bell, { className: `h-4 w-4 mr-1 ${subscribed ? "text-muted-foreground" : "text-primary"}` }),
      subscribed ? "Desativar notificações" : "Ativar notificações"
    ] })
  ] });
}
export {
  Settings as component
};
