import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { u as useAuth } from "./router-mRNo7IUv.js";
import { C as Card } from "./card-BtiUI6Md.js";
import { U as UsernameBadge } from "./UsernameBadge-BFbH-T_u.js";
import { Sparkles, Hash, Compass, Users } from "lucide-react";
import { B as Button } from "./button-DjOZMqFS.js";
import "@tanstack/react-query";
import "react";
import "@supabase/supabase-js";
import "sonner";
import "./badge-YM7oB01y.js";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
function Home() {
  const {
    profile,
    roles
  } = useAuth();
  if (!profile) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Carregando perfil…" });
  return /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto p-4 md:p-10 space-y-5 md:space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Bem-vindo de volta," }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl md:text-3xl font-bold mt-1", children: /* @__PURE__ */ jsx(UsernameBadge, { profile, roles }) })
    ] }),
    /* @__PURE__ */ jsx(Card, { className: "p-5 md:p-6 bg-gradient-to-br from-primary/10 to-gold/5 border-primary/20", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 md:gap-4", children: [
      /* @__PURE__ */ jsx(Sparkles, { className: "hidden sm:block h-6 w-6 text-gold mt-1 shrink-0" }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxs("h2", { className: "font-semibold text-sm md:text-base", children: [
          "Você está no plano ",
          /* @__PURE__ */ jsx("span", { className: "uppercase", children: profile.current_plan })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-xs md:text-sm text-muted-foreground mt-1", children: profile.current_plan === "free" ? "Suba pro PRO para banner GIF, nome rainbow, bio rica e mais." : "Aproveite todos os recursos PRO — customize seu perfil ao máximo." }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap gap-2", children: [
          /* @__PURE__ */ jsx(Link, { to: "/app/profile", children: /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", className: "h-9", children: "Editar perfil" }) }),
          profile.current_plan === "free" && /* @__PURE__ */ jsx(Link, { to: "/app/plans", children: /* @__PURE__ */ jsx(Button, { size: "sm", className: "h-9", children: "Quero ser PRO" }) })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "grid sm:grid-cols-2 gap-3 md:gap-4", children: [
      /* @__PURE__ */ jsx(Link, { to: "/app/servers", children: /* @__PURE__ */ jsxs(Card, { className: "p-4 md:p-5 hover:border-primary/50 transition-colors h-full", children: [
        /* @__PURE__ */ jsx(Hash, { className: "h-5 w-5 text-primary" }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold mt-2 text-sm md:text-base", children: "Meus servidores" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs md:text-sm text-muted-foreground mt-1", children: "Crie ou abra suas panelas pessoais." })
      ] }) }),
      /* @__PURE__ */ jsx(Link, { to: "/app/discover", children: /* @__PURE__ */ jsxs(Card, { className: "p-4 md:p-5 hover:border-primary/50 transition-colors h-full", children: [
        /* @__PURE__ */ jsx(Compass, { className: "h-5 w-5 text-primary" }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold mt-2 text-sm md:text-base", children: "Descobrir" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs md:text-sm text-muted-foreground mt-1", children: "Comunidades públicas pra entrar agora." })
      ] }) }),
      /* @__PURE__ */ jsx(Link, { to: "/app/profile", className: "sm:col-span-2", children: /* @__PURE__ */ jsxs(Card, { className: "p-4 md:p-5 hover:border-primary/50 transition-colors", children: [
        /* @__PURE__ */ jsx(Users, { className: "h-5 w-5 text-primary" }),
        /* @__PURE__ */ jsx("h3", { className: "font-semibold mt-2 text-sm md:text-base", children: "Personalize seu perfil" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs md:text-sm text-muted-foreground mt-1", children: "Cor do nome, status, banner, redes — capricha que o pessoal vê." })
      ] }) })
    ] })
  ] });
}
export {
  Home as component
};
