import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { u as useAuth, a as isCooOrAbove, i as isCeo, b as isStaff, s as supabase } from "./router-mRNo7IUv.js";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { I as Input } from "./input-D_U8fI25.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { T as Tabs, b as TabsList, c as TabsTrigger, a as TabsContent } from "./tabs-QL-0JTj_.js";
import { toast } from "sonner";
import { ShieldOff, Crown, Loader2, Check, X } from "lucide-react";
import "@tanstack/react-query";
import "@tanstack/react-router";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-select";
import "@radix-ui/react-tabs";
function AdminPanel() {
  const {
    roles,
    ready
  } = useAuth();
  const canApprove = isCooOrAbove(roles);
  const canGrantRoles = isCeo(roles);
  const allowed = isStaff(roles);
  const [subs, setSubs] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(null);
  async function reload() {
    setLoading(true);
    const [{
      data: s
    }, {
      data: p
    }] = await Promise.all([supabase.from("subscriptions").select("*").order("created_at", {
      ascending: false
    }).limit(100), supabase.from("profiles").select("id,username,display_name,current_plan,created_at").order("created_at", {
      ascending: false
    }).limit(100)]);
    const subRows = s ?? [];
    if (subRows.length) {
      const ids = Array.from(new Set(subRows.map((x) => x.user_id)));
      const {
        data: prof
      } = await supabase.from("profiles").select("id,username,display_name").in("id", ids);
      const map = new Map((prof ?? []).map((p2) => [p2.id, p2]));
      subRows.forEach((x) => {
        x.profile = map.get(x.user_id) ?? null;
      });
    }
    setSubs(subRows);
    setProfiles(p ?? []);
    setLoading(false);
  }
  useEffect(() => {
    if (allowed) reload();
  }, [allowed]);
  async function setSubStatus(id, status) {
    const update = {
      status,
      reviewed_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (status === "active") {
      update.starts_at = (/* @__PURE__ */ new Date()).toISOString();
      update.ends_at = new Date(Date.now() + 31 * 24 * 3600 * 1e3).toISOString();
    }
    const {
      error
    } = await supabase.from("subscriptions").update(update).eq("id", id);
    if (error) return toast.error(error.message);
    if (status === "active") {
      const sub = subs.find((x) => x.id === id);
      if (sub) {
        await supabase.from("profiles").update({
          current_plan: "pro",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("id", sub.user_id);
      }
    }
    toast.success("Atualizado");
    reload();
  }
  async function grantRole(userId, role) {
    setGranting(userId);
    const {
      error
    } = await supabase.from("user_roles").insert({
      user_id: userId,
      role
    });
    setGranting(null);
    if (error) return toast.error(error.message);
    toast.success(`Cargo ${role} concedido`);
  }
  async function revokeRole(userId, role) {
    const {
      error
    } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Cargo removido");
  }
  if (!ready) return null;
  if (!allowed) return /* @__PURE__ */ jsxs("div", { className: "max-w-md mx-auto p-10 text-center space-y-3", children: [
    /* @__PURE__ */ jsx(ShieldOff, { className: "h-10 w-10 mx-auto text-muted-foreground" }),
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: "Acesso restrito" }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Esta área é só para staff (admin / COO / CEO)." })
  ] });
  const filtered = profiles.filter((p) => !search || p.username.toLowerCase().includes(search.toLowerCase()) || (p.display_name ?? "").toLowerCase().includes(search.toLowerCase()));
  return /* @__PURE__ */ jsxs("div", { className: "max-w-5xl mx-auto p-4 sm:p-6 md:p-10 space-y-6", children: [
    /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between flex-wrap gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h1", { className: "text-2xl font-bold flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Crown, { className: "h-6 w-6 text-gold" }),
          "Painel Staff"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: roles.join(", ").toUpperCase() })
      ] }),
      /* @__PURE__ */ jsxs(Button, { variant: "outline", onClick: reload, disabled: loading, children: [
        loading && /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }),
        "Atualizar"
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Tabs, { defaultValue: "subs", children: [
      /* @__PURE__ */ jsxs(TabsList, { children: [
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "subs", children: [
          "Pedidos PRO (",
          subs.filter((s) => s.status === "pending").length,
          ")"
        ] }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "users", children: "Usuários" })
      ] }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "subs", className: "space-y-3 mt-4", children: [
        subs.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-sm", children: "Nenhum pedido ainda." }),
        subs.map((s) => /* @__PURE__ */ jsxs(Card, { className: "p-4 flex items-center gap-4 flex-wrap", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-[200px]", children: [
            /* @__PURE__ */ jsxs("div", { className: "font-medium", children: [
              "@",
              s.profile?.username ?? s.user_id.slice(0, 8)
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
              s.contact_method,
              ": ",
              s.contact_value
            ] }),
            s.notes && /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground mt-1", children: [
              '"',
              s.notes,
              '"'
            ] }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground mt-1", children: new Date(s.created_at).toLocaleString() })
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: s.status === "active" ? "default" : s.status === "pending" ? "outline" : "destructive", children: s.status }),
          s.status === "pending" && canApprove && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: () => setSubStatus(s.id, "active"), children: [
              /* @__PURE__ */ jsx(Check, { className: "h-4 w-4 mr-1" }),
              "Aprovar"
            ] }),
            /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "destructive", onClick: () => setSubStatus(s.id, "rejected"), children: [
              /* @__PURE__ */ jsx(X, { className: "h-4 w-4 mr-1" }),
              "Rejeitar"
            ] })
          ] }),
          s.status === "active" && canApprove && /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => setSubStatus(s.id, "canceled"), children: "Cancelar" })
        ] }, s.id))
      ] }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "users", className: "space-y-3 mt-4", children: [
        /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar por username ou nome…" }),
        filtered.map((p) => /* @__PURE__ */ jsxs(Card, { className: "p-4 flex items-center gap-4 flex-wrap", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-[200px]", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: p.display_name || p.username }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground", children: [
              "@",
              p.username,
              " · ",
              new Date(p.created_at).toLocaleDateString()
            ] })
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "uppercase", children: p.current_plan }),
          canGrantRoles && /* @__PURE__ */ jsxs("div", { className: "flex gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxs(Select, { disabled: granting === p.id, onValueChange: (v) => grantRole(p.id, v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[140px]", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Conceder cargo" }) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "admin", children: "Admin" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "coo", children: "COO" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "ceo", children: "CEO" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(Select, { onValueChange: (v) => revokeRole(p.id, v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[120px]", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Revogar" }) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "admin", children: "Admin" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "coo", children: "COO" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "ceo", children: "CEO" })
              ] })
            ] })
          ] })
        ] }, p.id))
      ] })
    ] }),
    !canGrantRoles && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Apenas o CEO pode conceder ou revogar cargos globais." })
  ] });
}
export {
  AdminPanel as component
};
