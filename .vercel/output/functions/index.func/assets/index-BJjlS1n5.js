import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight, Sparkles } from "lucide-react";
import { B as Button } from "./button-DjOZMqFS.js";
import "react";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
function DMsHome() {
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full flex-col justify-center gap-6 p-6 text-muted-foreground md:items-center", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-6 text-center shadow-sm", children: [
      /* @__PURE__ */ jsx(MessageSquare, { className: "h-16 w-16 text-primary/80" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-semibold text-foreground", children: "Painel de conversas" }),
        /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground max-w-md", children: "Use a lista ao lado para navegar rapidamente entre DMs e grupos. Toque rápido em qualquer conversa para visualizar as mensagens, ou abra um perfil para iniciar uma nova conversa." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [
      /* @__PURE__ */ jsx(Link, { to: "/app/servers", className: "rounded-3xl border border-border bg-background p-4 hover:border-primary transition-all", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-foreground", children: "Buscar membros" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Encontre pessoas e comece conversas em qualquer servidor." })
        ] }),
        /* @__PURE__ */ jsx(ArrowRight, { className: "h-5 w-5 text-primary" })
      ] }) }),
      /* @__PURE__ */ jsx(Link, { to: "/app/settings", className: "rounded-3xl border border-border bg-background p-4 hover:border-primary transition-all", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-foreground", children: "Ajustes de chat" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Configure preferências de DMs, modo móvel e atalhos." })
        ] }),
        /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5 text-primary" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-accent/40 p-4 text-sm text-foreground/90", children: [
      /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "Dica avançada" }),
      /* @__PURE__ */ jsx("p", { className: "mt-2 text-muted-foreground", children: "Use swipe ou toque prolongado no celular para abrir ações rápidas e responder mensagens sem perder o fluxo." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 sm:gap-4", children: [
      /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/app/servers", children: "Explorar servidores" }) }),
      /* @__PURE__ */ jsx(Button, { asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/app/settings", children: "Configurar chat" }) })
    ] })
  ] });
}
export {
  DMsHome as component
};
