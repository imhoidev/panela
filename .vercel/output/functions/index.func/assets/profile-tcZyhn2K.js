import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import { useState, useEffect } from "react";
import { C as Card } from "./card-BtiUI6Md.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { T as Textarea } from "./textarea-F69quoCd.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { T as Tabs, b as TabsList, c as TabsTrigger, a as TabsContent } from "./tabs-QL-0JTj_.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { U as UsernameBadge } from "./UsernameBadge-BFbH-T_u.js";
import { toast } from "sonner";
import { Lock, Sparkles, Loader2, Upload } from "lucide-react";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "@radix-ui/react-label";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-tabs";
import "@radix-ui/react-select";
function ProfilePage() {
  const {
    user,
    profile,
    roles,
    refreshProfile
  } = useAuth();
  const isPro = profile?.current_plan === "pro";
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [nameColor, setNameColor] = useState("#e4d8b4");
  const [nameColorsStr, setNameColorsStr] = useState("");
  const [nameEffect, setNameEffect] = useState("none");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [statusText, setStatusText] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(null);
  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setNameColor(profile.name_color ?? "#e4d8b4");
    setNameColorsStr((profile.name_colors ?? []).join(", "));
    setNameEffect(profile.name_effect ?? "none");
    const links = profile.social_links ?? {};
    setTwitter(links.twitter ?? "");
    setInstagram(links.instagram ?? "");
    setStatusText(profile.status_text ?? "");
  }, [profile]);
  async function uploadFile(kind, file) {
    if (!user) return;
    setUploading(kind);
    const bucket = kind === "avatar" ? "avatars" : "banners";
    const path = `${user.id}/${kind}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const {
      error: upErr
    } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true
    });
    if (upErr) {
      setUploading(null);
      return toast.error(upErr.message);
    }
    const {
      data: pub
    } = supabase.storage.from(bucket).getPublicUrl(path);
    const field = kind === "avatar" ? "avatar_url" : "banner_url";
    const {
      error
    } = await supabase.from("profiles").update({
      [field]: pub.publicUrl
    }).eq("id", user.id);
    setUploading(null);
    if (error) return toast.error(error.message);
    toast.success(`${kind === "avatar" ? "Avatar" : "Banner"} atualizado`);
    refreshProfile();
  }
  async function save() {
    if (!user) return;
    setSaving(true);
    const colorsArr = nameColorsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const update = {
      display_name: displayName || null,
      bio: bio || null,
      name_color: nameColor,
      status_text: statusText || null,
      social_links: {
        twitter: twitter || null,
        instagram: instagram || null
      },
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (isPro) {
      update.name_colors = colorsArr.length >= 2 ? colorsArr.slice(0, 5) : null;
      update.name_effect = nameEffect === "none" ? null : nameEffect;
    }
    const {
      error
    } = await supabase.from("profiles").update(update).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Perfil salvo");
    refreshProfile();
  }
  if (!profile) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Carregando…" });
  const planFeatures = [{
    label: "Bio rica até 1000 caracteres",
    active: true
  }, {
    label: "Nome colorido + gradiente + efeitos",
    active: true
  }, {
    label: "Avatar/banner GIF",
    active: false
  }, {
    label: "Upload até 100MB",
    active: false
  }, {
    label: "Tag PRO em todos os lugares",
    active: true
  }, {
    label: "Badge PRO custom",
    active: false
  }, {
    label: "Tema por servidor",
    active: false
  }];
  return /* @__PURE__ */ jsxs("div", { className: "max-w-6xl mx-auto p-6 md:p-10 space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-4 md:flex-row md:items-end md:justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold", children: "Meu perfil" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Gerencie sua presença, estilos e benefícios PRO em um só lugar." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center", children: [
        /* @__PURE__ */ jsx(Badge, { className: isPro ? "bg-gold text-background" : "bg-muted text-muted-foreground", children: isPro ? "PRO ativo" : "FREE" }),
        /* @__PURE__ */ jsx(Link, { to: "/app/plans", children: /* @__PURE__ */ jsx(Button, { variant: isPro ? "outline" : "default", children: isPro ? "Gerenciar PRO" : "Ir para PRO" }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-4 xl:grid-cols-[1.2fr_0.8fr]", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsx(ProfilePreviewCard, { profile, displayName, nameColor, nameColors: isPro && nameColorsStr ? nameColorsStr.split(",").map((s) => s.trim()).filter(Boolean) : null, nameEffect: isPro ? nameEffect : "none", statusText, twitter, instagram, isPro, roles }),
        /* @__PURE__ */ jsxs(Tabs, { defaultValue: "basic", children: [
          /* @__PURE__ */ jsxs(TabsList, { children: [
            /* @__PURE__ */ jsx(TabsTrigger, { value: "basic", children: "Básico" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "appearance", children: "Aparência" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "media", children: "Mídia" }),
            /* @__PURE__ */ jsx(TabsTrigger, { value: "social", children: "Redes" })
          ] }),
          /* @__PURE__ */ jsx(TabsContent, { value: "basic", className: "space-y-4 mt-4", children: /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Nome de exibição" }),
              /* @__PURE__ */ jsx(Input, { value: displayName, onChange: (e) => setDisplayName(e.target.value), maxLength: 32 })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Status" }),
              /* @__PURE__ */ jsx(Input, { value: statusText, onChange: (e) => setStatusText(e.target.value), maxLength: 80, placeholder: "Status curto e marcante" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Bio" }),
              /* @__PURE__ */ jsx(Textarea, { value: bio, onChange: (e) => setBio(e.target.value), rows: 4, maxLength: isPro ? 1e3 : 200 }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                bio.length,
                "/",
                isPro ? 1e3 : 200,
                " ",
                !isPro && "· PRO libera bio rica até 1000 caracteres"
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(TabsContent, { value: "appearance", className: "space-y-4 mt-4", children: /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Cor do nome" }),
              /* @__PURE__ */ jsx(Input, { type: "color", value: nameColor, onChange: (e) => setNameColor(e.target.value), className: "h-10 w-20 p-1" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 relative", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Label, { children: "Cores gradiente" }),
                !isPro && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1", children: [
                  /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3" }),
                  "PRO"
                ] })
              ] }),
              /* @__PURE__ */ jsx(Input, { disabled: !isPro, value: nameColorsStr, onChange: (e) => setNameColorsStr(e.target.value), placeholder: "#ff6b6b, #ffd43b, #51cf66" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx(Label, { children: "Efeito de nome" }),
                !isPro && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1", children: [
                  /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3" }),
                  "PRO"
                ] })
              ] }),
              /* @__PURE__ */ jsxs(Select, { value: nameEffect, onValueChange: setNameEffect, disabled: !isPro, children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsx(SelectItem, { value: "none", children: "Nenhum" }),
                  /* @__PURE__ */ jsx(SelectItem, { value: "glow", children: "Glow" }),
                  /* @__PURE__ */ jsx(SelectItem, { value: "rainbow", children: "Rainbow" }),
                  /* @__PURE__ */ jsx(SelectItem, { value: "typing", children: "Typing" })
                ] })
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(TabsContent, { value: "media", className: "space-y-4 mt-4", children: /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx(Label, { children: "Avatar" }),
              /* @__PURE__ */ jsx(FileBtn, { kind: "avatar", uploading, onPick: (f) => uploadFile("avatar", f) }),
              /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: isPro ? "PRO: PNG/JPG/GIF até 100MB" : "PNG/JPG até 8MB" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs(Label, { className: "flex items-center gap-2", children: [
                "Banner ",
                !isPro && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "gap-1", children: [
                  /* @__PURE__ */ jsx(Lock, { className: "h-3 w-3" }),
                  "PRO"
                ] })
              ] }),
              /* @__PURE__ */ jsx(FileBtn, { kind: "banner", uploading, onPick: (f) => uploadFile("banner", f), disabled: !isPro })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx(TabsContent, { value: "social", className: "space-y-4 mt-4", children: /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Twitter / X" }),
              /* @__PURE__ */ jsx(Input, { value: twitter, onChange: (e) => setTwitter(e.target.value), placeholder: "@username" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
              /* @__PURE__ */ jsx(Label, { children: "Instagram" }),
              /* @__PURE__ */ jsx(Input, { value: instagram, onChange: (e) => setInstagram(e.target.value), placeholder: "@username" })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsx(Sparkles, { className: "h-5 w-5 text-gold mt-0.5" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold", children: "Benefícios PRO" }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mt-1", children: "Melhore sua presença com as funcionalidades mais avançadas." })
            ] })
          ] }),
          /* @__PURE__ */ jsx("ul", { className: "space-y-3 text-sm", children: planFeatures.map((feature) => /* @__PURE__ */ jsxs("li", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsx("span", { className: `mt-1 h-4 w-4 rounded-full ${feature.active ? "bg-primary" : "bg-muted"}` }),
            /* @__PURE__ */ jsx("span", { className: feature.active ? "text-foreground" : "text-muted-foreground", children: feature.label })
          ] }, feature.label)) }),
          !isPro ? /* @__PURE__ */ jsxs("div", { className: "space-y-3 text-sm text-muted-foreground", children: [
            /* @__PURE__ */ jsx("p", { children: "Passe para PRO para liberar personalização completa, upload maior e identidade visual top." }),
            /* @__PURE__ */ jsx(Link, { to: "/app/plans", children: /* @__PURE__ */ jsx(Button, { className: "w-full", children: "Solicitar PRO" }) })
          ] }) : /* @__PURE__ */ jsx(Button, { className: "w-full", children: "Atualizar preferências PRO" })
        ] }),
        /* @__PURE__ */ jsxs(Card, { className: "p-5 space-y-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold", children: "Atalhos de perfil" }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3", children: [
            /* @__PURE__ */ jsx(Link, { to: "/app/servers", children: /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full", children: "Ver meus servidores" }) }),
            /* @__PURE__ */ jsx(Link, { to: "/app/discover", children: /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full", children: "Descobrir públicas" }) }),
            /* @__PURE__ */ jsx(Link, { to: "/app/settings", children: /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full", children: "Ajustes de conta" }) })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxs(Button, { onClick: save, disabled: saving, children: [
      saving && /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }),
      "Salvar alterações"
    ] }) })
  ] });
}
function ProfilePreviewCard({
  profile,
  displayName,
  nameColor,
  nameColors,
  nameEffect,
  statusText,
  twitter,
  instagram,
  isPro,
  roles
}) {
  const previewProfile = {
    ...profile,
    display_name: displayName,
    name_color: nameColor,
    name_colors: nameColors,
    name_effect: isPro ? nameEffect : "none"
  };
  return /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden border-border bg-card/90", children: [
    /* @__PURE__ */ jsxs("div", { className: "relative h-44 bg-slate-950/10", children: [
      profile.banner_url ? /* @__PURE__ */ jsx("img", { src: profile.banner_url, alt: "Banner de perfil", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("div", { className: "h-full w-full bg-gradient-to-br from-primary/20 via-transparent to-slate-900/20" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" }),
      /* @__PURE__ */ jsxs("div", { className: "absolute left-5 bottom-5 flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "relative h-20 w-20 rounded-3xl overflow-hidden border-2 border-white/10 bg-background/80", children: profile.avatar_url ? /* @__PURE__ */ jsx("img", { src: profile.avatar_url, alt: "Avatar", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("div", { className: "grid h-full w-full place-items-center text-2xl font-bold text-primary", children: profile.username[0]?.toUpperCase() }) }),
        /* @__PURE__ */ jsxs("div", { className: "text-white", children: [
          /* @__PURE__ */ jsx("div", { className: "text-xl font-semibold leading-tight", children: /* @__PURE__ */ jsx(UsernameBadge, { profile: previewProfile, roles }) }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-white/70", children: [
            "@",
            profile.username
          ] }),
          statusText && /* @__PURE__ */ jsx("div", { className: "mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/80", children: statusText })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "p-5 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        twitter && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "text-muted-foreground", children: [
          "Twitter: ",
          twitter
        ] }),
        instagram && /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "text-muted-foreground", children: [
          "Instagram: ",
          instagram
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: profile.bio || "Use este painel para moldar sua identidade PANELA." }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-2 text-xs text-muted-foreground", children: [
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-background/80 p-3", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "Criado em" }),
          /* @__PURE__ */ jsx("p", { children: new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR") })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-background/80 p-3", children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold", children: "Plano" }),
          /* @__PURE__ */ jsx("p", { children: profile.current_plan?.toUpperCase() || "FREE" })
        ] })
      ] })
    ] })
  ] });
}
function FileBtn({
  kind,
  uploading,
  onPick,
  disabled
}) {
  function onChange(e) {
    const f = e.target.files?.[0];
    if (f) onPick(f);
  }
  return /* @__PURE__ */ jsxs("label", { className: `mt-1 inline-flex items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm cursor-pointer hover:bg-accent ${disabled ? "opacity-50 cursor-not-allowed" : ""}`, children: [
    uploading === kind ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "h-4 w-4" }),
    "Escolher arquivo",
    /* @__PURE__ */ jsx("input", { type: "file", accept: "image/*", className: "hidden", disabled: disabled || !!uploading, onChange })
  ] });
}
export {
  ProfilePage as component
};
