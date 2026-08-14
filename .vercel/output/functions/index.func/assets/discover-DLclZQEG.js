import { jsxs, jsx } from "react/jsx-runtime";
import { useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { I as Input } from "./input-D_U8fI25.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
function Discover() {
  const {
    user
  } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [servers, setServers] = useState([]);
  const [myIds, setMyIds] = useState(/* @__PURE__ */ new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  async function load() {
    setLoading(true);
    let query = supabase.from("servers").select("*").eq("privacy", "public").order("member_count", {
      ascending: false
    }).limit(50);
    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    const {
      data
    } = await query;
    setServers(data ?? []);
    if (user) {
      const {
        data: mem
      } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
      setMyIds(new Set((mem ?? []).map((m) => m.server_id)));
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [user?.id]);
  async function join(id) {
    if (!user) return;
    setJoining(id);
    const {
      error
    } = await supabase.from("server_members").upsert({
      server_id: id,
      user_id: user.id,
      level: 1
    }, {
      onConflict: "server_id, user_id",
      ignoreDuplicates: true
    });
    setJoining(null);
    if (error && error.code !== "23505") return toast.error(error.message);
    toast.success("Entrou na panela!");
    router.navigate({
      to: "/app/servers/$serverId",
      params: {
        serverId: id
      }
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto p-4 md:p-10 space-y-6", children: [
    /* @__PURE__ */ jsx("section", { className: "rounded-[2rem] border border-border bg-gradient-to-br from-slate-950/80 via-background to-slate-950/40 p-6 shadow-sm shadow-slate-950/10", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-[.25em] text-primary/80", children: "Descobrir panelas" }),
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold tracking-tight", children: "Encontre comunidades públicas com estilo." }),
        /* @__PURE__ */ jsx("p", { className: "mt-3 max-w-2xl text-sm text-muted-foreground", children: "Acesse servidores ativos, com banner e cultura própria. Filtre por nome e entre direto nas panelas mais quentes." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-2 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-background/90 p-4 text-sm", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground uppercase tracking-[.2em] text-[10px]", children: "Mais populares" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 font-semibold", children: "Server público com fila ativa" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-3xl border border-border bg-background/90 p-4 text-sm", children: [
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground uppercase tracking-[.2em] text-[10px]", children: "Visibilidade" }),
          /* @__PURE__ */ jsx("p", { className: "mt-1 font-semibold", children: "Todos podem entrar" })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
      e.preventDefault();
      load();
    }, className: "relative max-w-md", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
      /* @__PURE__ */ jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Buscar por nome…", className: "pl-9 h-11" })
    ] }),
    loading ? /* @__PURE__ */ jsx(Card, { className: "p-8 text-center text-muted-foreground", children: "Carregando…" }) : servers.length === 0 ? /* @__PURE__ */ jsx(Card, { className: "p-8 text-center text-muted-foreground", children: "Nenhuma panela pública encontrada." }) : /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 xl:grid-cols-3 gap-4", children: servers.map((s) => {
      const joined = myIds.has(s.id);
      return /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border border-border bg-background transition hover:-translate-y-1 hover:shadow-lg", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative h-36 bg-slate-950/5", children: [
          s.banner_url ? /* @__PURE__ */ jsx("img", { src: s.banner_url, alt: "banner", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("div", { className: "h-full w-full bg-gradient-to-br from-primary/20 via-transparent to-slate-900/10" }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" }),
          /* @__PURE__ */ jsxs("div", { className: "absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ jsx("div", { className: "flex h-12 w-12 items-center justify-center rounded-3xl bg-background/90 text-lg font-semibold text-primary ring-1 ring-border overflow-hidden", children: s.icon_url ? /* @__PURE__ */ jsx("img", { src: s.icon_url, alt: "ícone", className: "h-full w-full object-cover" }) : s.name[0]?.toUpperCase() }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold text-white truncate", children: s.name }),
                s.slug && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-white/70 truncate font-mono", children: [
                  "@",
                  s.slug
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-white/20 text-white/80 bg-black/30", children: [
              s.member_count,
              " membros"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-5 flex flex-col gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-muted-foreground", children: s.privacy === "private" ? "Privado" : "Público" }),
            s.description ? /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-muted-foreground", children: s.description.length > 40 ? `${s.description.slice(0, 40)}…` : s.description }) : null
          ] }),
          s.description ? /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground line-clamp-3", children: s.description }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Sem descrição disponível." }),
          /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between gap-3", children: joined ? /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full", onClick: () => router.navigate({
            to: "/app/servers/$serverId",
            params: {
              serverId: s.id
            }
          }), children: "Abrir" }) : /* @__PURE__ */ jsxs(Button, { className: "w-full", disabled: joining === s.id, onClick: () => join(s.id), children: [
            joining === s.id && /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }),
            "Entrar"
          ] }) })
        ] })
      ] }, s.id);
    }) })
  ] });
}
export {
  Discover as component
};
