import { jsxs, jsx } from "react/jsx-runtime";
import { useRouter, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { T as Textarea } from "./textarea-F69quoCd.js";
import { R as ResponsiveDialog } from "./responsive-dialog-B76QsuFm.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { Hash, Camera, AtSign, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { s as slugify, i as isValidSlug } from "./slug-CXJ2YZ-z.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "./dialog-BzLIvjno.js";
import "@radix-ui/react-dialog";
import "vaul";
import "@radix-ui/react-select";
function ServersIndex() {
  const {
    user
  } = useAuth();
  const router = useRouter();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [iconFile, setIconFile] = useState(null);
  const [iconPreview, setIconPreview] = useState(null);
  const autoSlug = useMemo(() => slugify(name) || "", [name]);
  const finalSlug = slugTouched ? slug : autoSlug;
  const slugOk = finalSlug === "" || isValidSlug(finalSlug);
  async function load() {
    if (!user) return;
    setLoading(true);
    const {
      data: mem
    } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
    const ids = (mem ?? []).map((m) => m.server_id);
    if (!ids.length) {
      setServers([]);
      setLoading(false);
      return;
    }
    const {
      data
    } = await supabase.from("servers").select("*").in("id", ids).order("updated_at", {
      ascending: false
    });
    setServers(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [user?.id]);
  async function create() {
    if (!user || !name.trim()) return;
    if (!slugOk) return toast.error("Slug inválido (use 2-32 chars, a-z, 0-9, -).");
    setCreating(true);
    const {
      data,
      error
    } = await supabase.from("servers").insert({
      owner_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      privacy,
      slug: finalSlug || null
    }).select().single();
    if (error) {
      setCreating(false);
      if (error.code === "23505") return toast.error("Esse slug já está em uso.");
      return toast.error(error.message);
    }
    if (iconFile) {
      const apiUrl = "";
      const formData = new FormData();
      formData.append("file", iconFile);
      formData.append("server_id", data.id);
      await fetch(`${apiUrl}/api/upload-server-icon`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: formData
      });
    }
    setCreating(false);
    toast.success(`Servidor criado! @${data.slug}`);
    setOpen(false);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setIconFile(null);
    setIconPreview(null);
    router.navigate({
      to: "/app/servers/$serverId",
      params: {
        serverId: data.id
      }
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto p-6 md:p-10 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 sm:flex-row sm:items-end justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Meus servidores" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Suas panelas pessoais. Crie, convide, converse." })
      ] }),
      /* @__PURE__ */ jsx(ResponsiveDialog, { open, onOpenChange: setOpen, title: "Criar servidor", trigger: /* @__PURE__ */ jsxs(Button, { children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1.5" }),
        "Novo servidor"
      ] }), children: /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("div", { className: "h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 ring-2 ring-border/40 grid place-items-center overflow-hidden", children: iconPreview ? /* @__PURE__ */ jsx("img", { src: iconPreview, alt: "", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx(Hash, { className: "h-8 w-8 text-primary/60" }) }),
          /* @__PURE__ */ jsxs("label", { className: "absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border border-border grid place-items-center cursor-pointer hover:bg-accent transition-colors shadow-sm", children: [
            /* @__PURE__ */ jsx(Camera, { className: "h-3.5 w-3.5 text-muted-foreground" }),
            /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", className: "hidden", onChange: (e) => {
              const f = e.target.files?.[0];
              if (f) {
                setIconFile(f);
                setIconPreview(URL.createObjectURL(f));
              }
              e.target.value = "";
            } })
          ] }),
          iconPreview && /* @__PURE__ */ jsx("button", { onClick: () => {
            setIconFile(null);
            setIconPreview(null);
          }, className: "absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground grid place-items-center text-[10px] hover:bg-destructive transition-colors shadow-sm", children: "×" })
        ] }) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Nome da panela" }),
          /* @__PURE__ */ jsx(Input, { value: name, onChange: (e) => setName(e.target.value), maxLength: 48, placeholder: "Ex: Amigos do Churrasco", className: "h-10" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Slug (URL pública)" }),
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(AtSign, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
            /* @__PURE__ */ jsx(Input, { className: "pl-8 h-10", value: finalSlug, onChange: (e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }, maxLength: 32, placeholder: "amigos-do-churrasco" })
          ] }),
          /* @__PURE__ */ jsxs("p", { className: `text-xs ${slugOk ? "text-muted-foreground" : "text-destructive"}`, children: [
            "panela.app/s/",
            finalSlug || "<gerado-automatico>"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Descrição" }),
          /* @__PURE__ */ jsx(Textarea, { value: description, onChange: (e) => setDescription(e.target.value), maxLength: 300, rows: 3, placeholder: "Um lugar pra gente se encontrar e conversar..." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-end", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Privacidade" }),
            /* @__PURE__ */ jsxs(Select, { value: privacy, onValueChange: (v) => setPrivacy(v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "h-10", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsxs(SelectItem, { value: "public", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Pública" }),
                  " — qualquer um entra"
                ] }),
                /* @__PURE__ */ jsxs(SelectItem, { value: "private", children: [
                  /* @__PURE__ */ jsx("span", { className: "font-medium", children: "Privada" }),
                  " — só por convite"
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(Button, { className: "h-10 w-full sm:w-auto", onClick: create, disabled: creating || !name.trim() || !slugOk, children: [
            creating ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1.5" }),
            creating ? "Criando..." : "Criar panela"
          ] })
        ] })
      ] }) })
    ] }),
    loading ? /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Carregando…" }) : servers.length === 0 ? /* @__PURE__ */ jsxs(Card, { className: "p-8 text-center space-y-3", children: [
      /* @__PURE__ */ jsx(Hash, { className: "h-8 w-8 mx-auto text-muted-foreground" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Você ainda não está em nenhuma panela." }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-center gap-2", children: [
        /* @__PURE__ */ jsxs(Button, { onClick: () => setOpen(true), children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1.5" }),
          "Criar a primeira"
        ] }),
        /* @__PURE__ */ jsx(Link, { to: "/app/discover", children: /* @__PURE__ */ jsx(Button, { variant: "outline", children: "Descobrir públicas" }) })
      ] })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-4", children: servers.map((s) => /* @__PURE__ */ jsx(Link, { to: "/app/servers/$serverId", params: {
      serverId: s.id
    }, children: /* @__PURE__ */ jsxs(Card, { className: "p-5 hover:border-primary/50 transition-colors h-full", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
        s.icon_url ? /* @__PURE__ */ jsx("img", { src: s.icon_url, alt: "", className: "h-12 w-12 rounded-xl object-cover" }) : /* @__PURE__ */ jsx("div", { className: "h-12 w-12 rounded-xl bg-primary/15 grid place-items-center font-bold text-primary", children: s.name[0]?.toUpperCase() }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold truncate", children: s.name }),
          s.slug && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground/80 truncate", children: [
            "@",
            s.slug
          ] }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }),
            s.member_count,
            " ",
            s.privacy === "private" && "· privado"
          ] })
        ] })
      ] }),
      s.description && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-3 line-clamp-2", children: s.description })
    ] }) }, s.id)) })
  ] });
}
export {
  ServersIndex as component
};
