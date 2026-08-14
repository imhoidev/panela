import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useRouter, useParams, useLocation, Link, Outlet } from "@tanstack/react-router";
import * as React from "react";
import { useRef, useEffect, useCallback, useState, useMemo, useContext, createContext } from "react";
import { s as supabase, u as useAuth } from "./router-mRNo7IUv.js";
import { c as cn, B as Button } from "./button-DjOZMqFS.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { S as Sheet, a as SheetContent } from "./sheet-DQ5cLgT7.js";
import { R as ResponsiveDialog } from "./responsive-dialog-B76QsuFm.js";
import { T as Tabs, b as TabsList, c as TabsTrigger, a as TabsContent } from "./tabs-QL-0JTj_.js";
import { S as ScrollArea } from "./scroll-area-JK6xafWT.js";
import { S as Switch } from "./switch-DkA5ZPe7.js";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { t as useServerRoles, S as Skeleton, w as useServerXPRewards, u as useAddXPReward, m as useRemoveXPReward, B as useUpdateServer, g as useDeleteServer, v as useServerXP, j as useMemberRoleMap, o as useServerBans, s as useServerMutes, h as useKickMember, d as useBanMember, k as useMuteMember, x as useUnbanMember, y as useUnmuteMember, c as useAssignRole, l as useRemoveRole, A as useUpdateMemberLevel, P as Popover, b as PopoverTrigger, a as PopoverContent, p as useServerChannels, z as useUpdateChannel, f as useDeleteChannel, q as useServerDetails, i as useMemberLevel, e as useCreateChannel, n as useReorderChannels, M as ModeracaoDialog, r as useServerMembers } from "./ModPanel-BYNGaQNI.js";
import { toast } from "sonner";
import { Shield, Trash2, Plus, Sticker, X, Upload, Star, Globe, Lock, Search, Users, Crown, VolumeX, Ban, GripVertical, Pencil, Hash, MessageSquareText, ScrollText, MessageSquare, Volume2, ChevronRight, ChevronDown, Folder, FolderOpen, Calendar, CalendarDays, RefreshCw, Copy, Link2, ArrowLeft, Settings, Menu, Check, Edit3, AtSign, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { s as slugify, i as isValidSlug } from "./slug-CXJ2YZ-z.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { T as Textarea } from "./textarea-F69quoCd.js";
import { u as useRealtimeSocket } from "./useRealtime-Cqf46s7E.js";
import "@supabase/supabase-js";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-label";
import "@radix-ui/react-select";
import "@radix-ui/react-dialog";
import "./dialog-BzLIvjno.js";
import "vaul";
import "@radix-ui/react-tabs";
import "@radix-ui/react-scroll-area";
import "@radix-ui/react-switch";
import "@radix-ui/react-popover";
import "@radix-ui/react-avatar";
import "socket.io-client";
const Slider = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsxs(
  SliderPrimitive.Root,
  {
    ref,
    className: cn("relative flex w-full touch-none select-none items-center", className),
    ...props,
    children: [
      /* @__PURE__ */ jsx(SliderPrimitive.Track, { className: "relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20", children: /* @__PURE__ */ jsx(SliderPrimitive.Range, { className: "absolute h-full bg-primary" }) }),
      /* @__PURE__ */ jsx(SliderPrimitive.Thumb, { className: "block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" })
    ]
  }
));
Slider.displayName = SliderPrimitive.Root.displayName;
function useServerRealtime(serverId) {
  const qc = useQueryClient();
  const { socket } = useRealtimeSocket();
  const joinRef = useRef(false);
  useEffect(() => {
    if (!serverId || !socket) return;
    if (joinRef.current) return;
    const joinServer = () => {
      socket.emit("presence:join", { serverId, status: "online" });
      joinRef.current = true;
    };
    if (socket.connected) joinServer();
    socket.on("connect", joinServer);
    return () => {
      socket.off("connect", joinServer);
      if (socket.connected) socket.emit("presence:join", { serverId: null, status: "offline" });
      joinRef.current = false;
    };
  }, [serverId, socket]);
  useEffect(() => {
    if (!serverId) return;
    const channel = supabase.channel(`server-realtime-${serverId}`).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "channels",
      filter: `server_id=eq.${serverId}`
    }, () => qc.invalidateQueries({ queryKey: ["channels", serverId] })).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "server_members",
      filter: `server_id=eq.${serverId}`
    }, () => {
      qc.invalidateQueries({ queryKey: ["members", serverId] });
      qc.invalidateQueries({ queryKey: ["server", serverId] });
    }).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "server_roles",
      filter: `server_id=eq.${serverId}`
    }, () => qc.invalidateQueries({ queryKey: ["roles", serverId] })).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "server_member_roles"
    }, () => qc.invalidateQueries({ queryKey: ["memberRoleMap", serverId] })).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "server_bans",
      filter: `server_id=eq.${serverId}`
    }, () => qc.invalidateQueries({ queryKey: ["bans", serverId] })).on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "server_mutes",
      filter: `server_id=eq.${serverId}`
    }, () => qc.invalidateQueries({ queryKey: ["mutes", serverId] })).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [serverId, qc]);
}
function usePresenceChannel(serverId, userId, onPresence) {
  const { socket, connected } = useRealtimeSocket();
  const lastMap = useRef(/* @__PURE__ */ new Map());
  const handleUsers = useCallback((users) => {
    const map = /* @__PURE__ */ new Map();
    users.forEach((user) => map.set(user.userId, user.status || "offline"));
    lastMap.current = map;
    onPresence(map);
  }, [onPresence]);
  useEffect(() => {
    if (!serverId || !userId) return;
    if (socket?.connected) {
      const joinServer = () => {
        socket.emit("presence:join", { serverId, status: "online" });
      };
      const onPresenceUpdate = ({ userId: uid, status }) => {
        const updated = new Map(lastMap.current);
        updated.set(uid, status || "offline");
        lastMap.current = updated;
        onPresence(updated);
      };
      socket.on("presence:users", handleUsers);
      socket.on("presence:update", onPresenceUpdate);
      socket.on("connect", joinServer);
      if (socket.connected) joinServer();
      return () => {
        socket.off("presence:users", handleUsers);
        socket.off("presence:update", onPresenceUpdate);
        socket.off("connect", joinServer);
        if (socket.connected) socket.emit("presence:join", { serverId: null, status: "offline" });
      };
    }
    const chan = supabase.channel(`presence:${serverId}`, {
      config: { presence: { key: userId } }
    });
    chan.on("presence", { event: "sync" }, () => {
      const state = chan.presenceState();
      const m = /* @__PURE__ */ new Map();
      Object.entries(state).forEach(([uid, infos]) => {
        m.set(uid, infos?.[0]?.status || "online");
      });
      onPresence(m);
    });
    chan.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await chan.track({ user_id: userId, status: "online", server_id: serverId });
      }
    });
    return () => {
      supabase.removeChannel(chan);
    };
  }, [serverId, userId, socket, connected, handleUsers, onPresence]);
}
const PERM_CATEGORIES = [
  {
    label: "Administração & Estrutura",
    perms: [
      { key: "ADMINISTRATE", label: "Administrar comunidade" },
      { key: "MANAGE_CHANNELS", label: "Gerenciar canais" },
      { key: "MANAGE_CATEGORIES", label: "Gerenciar categorias" },
      { key: "MANAGE_ROLES", label: "Gerenciar cargos" },
      { key: "CREATE_INVITES", label: "Criar convites" }
    ]
  },
  {
    label: "Moderação & Membros",
    perms: [
      { key: "MANAGE_MEMBERS", label: "Gerenciar membros" },
      { key: "KICK_MEMBERS", label: "Expulsar membros" },
      { key: "BAN_MEMBERS", label: "Banir membros" },
      { key: "MUTE_MEMBERS", label: "Silenciar membros" }
    ]
  },
  {
    label: "Mensagens & Chat",
    perms: [
      { key: "SEND_MESSAGES", label: "Enviar mensagens" },
      { key: "MANAGE_MESSAGES", label: "Gerenciar mensagens" },
      { key: "MENTION_EVERYONE", label: "Mencionar todos (@everyone)" },
      { key: "ATTACH_FILES", label: "Anexar arquivos" }
    ]
  },
  {
    label: "Voz, Vídeo & Tela",
    perms: [
      { key: "USE_VOICE", label: "Usar canal de voz" },
      { key: "USE_CAMERA", label: "Usar câmera" },
      { key: "SHARE_SCREEN", label: "Compartilhar tela" }
    ]
  }
];
function ServerRoles({ serverId, canManage }) {
  const { data: rolesData = [], isLoading } = useServerRoles(serverId);
  const roles = rolesData;
  const qc = useQueryClient();
  const [localRoles, setLocalRoles] = useState(null);
  const displayRoles = localRoles ?? roles;
  function refetch() {
    qc.invalidateQueries({ queryKey: ["roles", serverId] });
    setLocalRoles(null);
  }
  async function create() {
    const { error } = await supabase.from("server_roles").insert({
      server_id: serverId,
      name: "Novo cargo",
      level: 1,
      permissions: {}
    });
    if (error) toast.error(error.message);
    else refetch();
  }
  async function save(r) {
    const { error } = await supabase.from("server_roles").update({
      name: r.name,
      level: r.level,
      color: r.color || null,
      permissions: r.permissions,
      gif_tag_url: r.gif_tag_url || null
    }).eq("id", r.id);
    if (error) toast.error(error.message);
    else refetch();
  }
  async function remove(id) {
    if (!confirm("Excluir cargo? Membros com este cargo perderão ele.")) return;
    await supabase.from("server_roles").delete().eq("id", id);
    refetch();
  }
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "space-y-3", children: [1, 2].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-48 w-full rounded-lg" }, i)) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    displayRoles.length === 0 && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center py-8 text-muted-foreground/60", children: [
      /* @__PURE__ */ jsx(Shield, { className: "h-8 w-8 mb-2 opacity-30" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: "Nenhum cargo ainda." })
    ] }),
    /* @__PURE__ */ jsx(ScrollArea, { className: "max-h-[50dvh] pr-2 -mr-2", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: displayRoles.map((r) => {
      const local = localRoles?.find((x) => x.id === r.id) ?? r;
      return /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-4 space-y-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [
            r.color && /* @__PURE__ */ jsx("span", { className: "h-4 w-4 rounded-full shrink-0 ring-1 ring-border/30", style: { backgroundColor: r.color } }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: local.name,
                onChange: (e) => setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, name: e.target.value } : x)),
                className: "h-8 text-sm font-medium flex-1 min-w-0",
                onBlur: () => {
                  save({ ...local, name: local.name.trim() || "Sem nome" });
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-destructive shrink-0", onClick: () => remove(r.id), disabled: !canManage, children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxs(Label, { className: "text-xs shrink-0 w-16", children: [
            "Nível ",
            local.level
          ] }),
          /* @__PURE__ */ jsx(
            Slider,
            {
              value: [local.level],
              onValueChange: ([v]) => {
                setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, level: v } : x));
              },
              min: 1,
              max: 99,
              className: "flex-1",
              onValueCommit: ([v]) => save({ ...local, level: v })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Cor" }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx(
                Input,
                {
                  type: "color",
                  value: local.color || "#e4d8b4",
                  onChange: (e) => setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, color: e.target.value } : x)),
                  className: "h-8 w-12 p-0.5 cursor-pointer",
                  onBlur: () => save({ ...local, color: local.color })
                }
              ),
              local.color && /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: () => {
                    setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, color: null } : x));
                    save({ ...local, color: null });
                  },
                  className: "text-[10px] text-muted-foreground/50 hover:text-foreground",
                  children: "Limpar"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Badge GIF (URL)" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: local.gif_tag_url || "",
                placeholder: "https://...",
                onChange: (e) => setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, gif_tag_url: e.target.value } : x)),
                className: "h-8 text-xs font-mono",
                onBlur: () => save({ ...local, gif_tag_url: local.gif_tag_url })
              }
            )
          ] })
        ] }),
        local.gif_tag_url && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsx("span", { children: "Preview:" }),
          /* @__PURE__ */ jsx("img", { src: local.gif_tag_url, alt: "", className: "h-5 w-5 object-contain" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-2", children: PERM_CATEGORIES.map((cat) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-1.5", children: cat.label }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1", children: cat.perms.map((perm) => /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-2 text-xs py-0.5", children: [
            /* @__PURE__ */ jsx(
              Switch,
              {
                checked: Boolean(local.permissions?.[perm.key]),
                disabled: !canManage,
                onCheckedChange: (v) => {
                  const current = local.permissions && typeof local.permissions === "object" ? local.permissions : {};
                  const newPerms = { ...current, [perm.key]: v };
                  setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, permissions: newPerms } : x));
                  save({ ...local, permissions: newPerms });
                }
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "cursor-pointer", children: perm.label })
          ] }, perm.key)) })
        ] }, cat.label)) })
      ] }, r.id);
    }) }) }),
    canManage && /* @__PURE__ */ jsxs(Button, { onClick: create, variant: "outline", className: "w-full h-9 text-xs gap-1.5", children: [
      /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
      " Criar cargo"
    ] })
  ] });
}
function ProgressBar({
  value,
  max,
  label,
  className
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const percent = Math.round(ratio * 100);
  return /* @__PURE__ */ jsxs("div", { className: cn("space-y-2", className), children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsx("span", { children: label ?? "Progresso" }),
      /* @__PURE__ */ jsxs("span", { children: [
        percent,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-2 w-full overflow-hidden rounded-full bg-border/50", children: /* @__PURE__ */ jsx("div", { className: "h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all", style: { width: `${percent}%` } }) })
  ] });
}
const REWARD_TYPES = [
  { value: "role", label: "Cargo" },
  { value: "item", label: "Item" },
  { value: "custom", label: "Personalizado" }
];
function ServerRewardsTab({ serverId, canManage }) {
  const { data: rewards = [], isLoading } = useServerXPRewards(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const addReward = useAddXPReward(serverId);
  const removeReward = useRemoveXPReward(serverId);
  const [newThreshold, setNewThreshold] = useState(5);
  const [newType, setNewType] = useState("role");
  const [newValue, setNewValue] = useState(roles[0]?.id ?? "");
  const [newMessage, setNewMessage] = useState("");
  const roleOptions = useMemo(() => roles.map((role) => ({ id: role.id, name: role.name })), [roles]);
  const create = async () => {
    if (!canManage) {
      toast.error("Apenas gerentes podem adicionar recompensas.");
      return;
    }
    if (!newValue.trim()) {
      toast.error("Defina um valor para a recompensa.");
      return;
    }
    addReward.mutate({ level_threshold: newThreshold, reward_type: newType, reward_value: newValue, message: newMessage || null });
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs(Card, { className: "p-4 border border-border/70 bg-card/80", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold", children: "Recompensas de nível" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Defina recompensas automáticas que seus membros ganham ao subir de nível." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 text-sm text-muted-foreground", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            "Recompensas cadastradas: ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: rewards.length })
          ] }),
          /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "bg-muted-foreground/5 text-muted-foreground", children: "Nível mínimo 5" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-[1fr_auto]", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-3 sm:grid-cols-[1fr_1fr]", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Threshold" }),
            /* @__PURE__ */ jsx(Input, { type: "number", min: 1, value: newThreshold, onChange: (e) => setNewThreshold(Number(e.target.value)), className: "h-10" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Tipo" }),
            /* @__PURE__ */ jsxs(Select, { value: newType, onValueChange: (value) => setNewType(value), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "h-10", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Tipo" }) }),
              /* @__PURE__ */ jsx(SelectContent, { children: REWARD_TYPES.map((type) => /* @__PURE__ */ jsx(SelectItem, { value: type.value, children: type.label }, type.value)) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Button, { className: "h-10", onClick: create, disabled: addReward.isPending || !canManage, children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4" }),
          " Adicionar regra"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Valor da recompensa" }),
          newType === "role" ? /* @__PURE__ */ jsxs(Select, { value: newValue, onValueChange: (value) => setNewValue(value), children: [
            /* @__PURE__ */ jsx(SelectTrigger, { className: "h-10", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione um cargo" }) }),
            /* @__PURE__ */ jsx(SelectContent, { children: roleOptions.length ? roleOptions.map((role) => /* @__PURE__ */ jsx(SelectItem, { value: role.id, children: role.name }, role.id)) : /* @__PURE__ */ jsx(SelectItem, { value: "", children: "Nenhum cargo disponível" }) })
          ] }) : /* @__PURE__ */ jsx(Input, { value: newValue, onChange: (e) => setNewValue(e.target.value), placeholder: newType === "item" ? "Nome do item" : "Descrição personalizada", className: "h-10" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Mensagem" }),
          /* @__PURE__ */ jsx(Input, { value: newMessage, onChange: (e) => setNewMessage(e.target.value), placeholder: "Mensagem opcional", className: "h-10" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "p-4 border border-border/70 bg-card/80", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-4 mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold", children: "Regras atuais" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "As recompensas são concedidas automaticamente quando o membro atinge o nível definido." })
        ] }),
        /* @__PURE__ */ jsxs(Badge, { variant: "secondary", className: "text-xs", children: [
          "Total: ",
          rewards.length
        ] })
      ] }),
      /* @__PURE__ */ jsx(ScrollArea, { className: "max-h-[52vh] pr-2 -mr-2", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: rewards.length === 0 ? /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground", children: "Nenhuma regra cadastrada ainda." }) : rewards.map((reward) => /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border p-4 bg-background/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 items-center text-sm font-semibold text-foreground", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              reward.level_threshold,
              "º nível"
            ] }),
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "text-xs", children: reward.reward_type })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: reward.reward_type === "role" ? `Cargo: ${roles.find((r) => r.id === reward.reward_value)?.name ?? reward.reward_value}` : reward.reward_value }),
          reward.message && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/80", children: reward.message })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(ProgressBar, { value: Math.min(reward.level_threshold, 100), max: 100, label: "Prioridade" }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", size: "sm", className: "h-9", onClick: () => removeReward.mutate(reward.id), disabled: removeReward.isPending || !canManage, children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
        ] })
      ] }, reward.id)) }) })
    ] })
  ] });
}
function ServerStickers({ serverId, canManage }) {
  const [packs, setPacks] = useState([]);
  const [newPackName, setNewPackName] = useState("");
  const [uploading, setUploading] = useState({});
  const fileRefs = useRef({});
  function load() {
    supabase.from("sticker_packs").select("*, stickers(*)").eq("server_id", serverId).order("created_at").then(({ data }) => {
      setPacks(data ?? []);
    });
  }
  useEffect(() => {
    load();
  }, [serverId]);
  async function createPack() {
    const name = newPackName.trim();
    if (!name) return toast.error("Nome do pack é obrigatório");
    const { error } = await supabase.from("sticker_packs").insert({
      server_id: serverId,
      name,
      owner_id: (await supabase.auth.getUser()).data.user?.id
    });
    if (error) return toast.error(error.message);
    setNewPackName("");
    load();
  }
  async function deletePack(id) {
    if (!confirm("Excluir pack e todas as figurinhas?")) return;
    await supabase.from("sticker_packs").delete().eq("id", id);
    load();
  }
  async function uploadSticker(packId, file) {
    setUploading((prev) => ({ ...prev, [packId]: true }));
    try {
      const apiUrl = "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sticker_pack_id", packId);
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/upload-sticker`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        body: formData
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Upload falhou");
      }
      const { url } = await res.json();
      await supabase.from("stickers").insert({
        pack_id: packId,
        name: file.name.replace(/\.[^.]+$/, "").slice(0, 32),
        url
      });
      toast.success("Figurinha adicionada!");
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading((prev) => ({ ...prev, [packId]: false }));
    }
  }
  async function deleteSticker(stickerId) {
    await supabase.from("stickers").delete().eq("id", stickerId);
    load();
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    canManage && /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
      /* @__PURE__ */ jsx(
        Input,
        {
          value: newPackName,
          onChange: (e) => setNewPackName(e.target.value),
          placeholder: "Nome do novo pack...",
          className: "h-9 text-sm flex-1",
          onKeyDown: (e) => {
            if (e.key === "Enter") createPack();
          }
        }
      ),
      /* @__PURE__ */ jsxs(Button, { onClick: createPack, size: "sm", className: "shrink-0", children: [
        /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1" }),
        "Criar"
      ] })
    ] }),
    packs.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/60 text-center py-6", children: "Nenhum pack de figurinhas ainda." }),
    /* @__PURE__ */ jsx(ScrollArea, { className: "max-h-[50dvh] pr-2 -mr-2", children: /* @__PURE__ */ jsx("div", { className: "space-y-4", children: packs.map((pack) => /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-3 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx(Sticker, { className: "h-4 w-4 text-primary shrink-0" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-medium truncate", children: pack.name }),
          /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-muted-foreground/50", children: [
            "(",
            pack.stickers?.length ?? 0,
            " stickers)"
          ] })
        ] }),
        canManage && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-destructive shrink-0", onClick: () => deletePack(pack.id), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-6 sm:grid-cols-8 gap-2", children: [
        pack.stickers?.map((s) => /* @__PURE__ */ jsxs("div", { className: "group relative aspect-square rounded-lg overflow-hidden bg-accent/30", children: [
          /* @__PURE__ */ jsx("img", { src: s.url, alt: s.name, className: "w-full h-full object-contain p-1", title: s.name }),
          canManage && /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => deleteSticker(s.id),
              className: "absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground",
              title: "Remover",
              children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" })
            }
          )
        ] }, s.id)),
        canManage && /* @__PURE__ */ jsxs(
          "div",
          {
            className: "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-colors flex items-center justify-center cursor-pointer relative",
            onClick: () => fileRefs.current[pack.id]?.click(),
            children: [
              uploading[pack.id] ? /* @__PURE__ */ jsx("div", { className: "h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "h-5 w-5 text-muted-foreground/40" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: (el) => {
                    fileRefs.current[pack.id] = el;
                  },
                  type: "file",
                  className: "hidden",
                  accept: "image/*",
                  onChange: (e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadSticker(pack.id, f);
                    e.target.value = "";
                  }
                }
              )
            ]
          }
        )
      ] })
    ] }, pack.id)) }) })
  ] });
}
const LEVELS = [
  { min: 0, label: "Novato", color: "text-muted-foreground" },
  { min: 10, label: "Frequente", color: "text-green-400" },
  { min: 25, label: "Membro", color: "text-blue-400" },
  { min: 50, label: "Veterano", color: "text-purple-400" },
  { min: 100, label: "Lenda", color: "text-yellow-500" },
  { min: 200, label: "Panela de Ouro", color: "text-amber-500" }
];
function LevelBadge({ xp, size = "sm" }) {
  const total = xp || 0;
  const level = Math.floor(Math.sqrt(total / 10));
  const label = [...LEVELS].reverse().find((l) => level >= l.min)?.label || "Novato";
  const nextLevelXp = (level + 1) ** 2 * 10;
  const currentLevelXp = level ** 2 * 10;
  const progress = nextLevelXp > currentLevelXp ? (total - currentLevelXp) / (nextLevelXp - currentLevelXp) : 1;
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsxs("span", { className: `inline-flex items-center gap-0.5 text-[11px] font-medium ${size === "md" ? "text-xs" : ""}`, children: [
      /* @__PURE__ */ jsx(Star, { className: `${size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} text-amber-400` }),
      "Lv.",
      level,
      " ",
      label
    ] }),
    size === "md" && /* @__PURE__ */ jsx("div", { className: "w-16 h-1.5 rounded-full bg-accent overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-amber-400 rounded-full transition-all", style: { width: `${Math.min(progress * 100, 100)}%` } }) })
  ] });
}
function ServerOverviewTab({
  server,
  serverId,
  isOwner,
  canManage,
  onServerUpdate
}) {
  const router = useRouter();
  const [editName, setEditName] = useState(server.name);
  const [editDesc, setEditDesc] = useState(server.description ?? "");
  const [editPrivacy, setEditPrivacy] = useState(server.privacy || "public");
  const [newSlug, setNewSlug] = useState(server.slug ?? "");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);
  const bannerRef = useRef(null);
  const updateServer = useUpdateServer(serverId);
  const deleteServer = useDeleteServer(serverId);
  const { user } = useAuth();
  const { data: serverXP } = useServerXP(serverId, user?.id);
  const xpCurrent = serverXP?.xp ?? 0;
  const xpLevel = serverXP?.level ?? 0;
  const xpNext = serverXP?.nextXp ?? 10;
  const xpLevelBase = xpLevel ** 2 * 10;
  const xpTowardsNext = Math.max(0, xpCurrent - xpLevelBase);
  const xpNextThreshold = Math.max(1, xpNext - xpLevelBase);
  serverXP?.progress ?? (xpNextThreshold > 0 ? xpTowardsNext / xpNextThreshold : 0);
  async function uploadIcon(file) {
    if (uploadingIcon) return;
    setUploadingIcon(true);
    try {
      const apiUrl = "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("server_id", serverId);
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/upload-server-icon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        body: formData
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Upload falhou");
      }
      const { url } = await res.json();
      await supabase.from("servers").update({ icon_url: url }).eq("id", serverId);
      onServerUpdate({ ...server, icon_url: url });
      toast.success("Ícone atualizado!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploadingIcon(false);
    }
  }
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadIcon(file);
  }, [serverId]);
  async function handleDelete() {
    if (!confirm("TEM CERTEZA? Esta ação é irreversível.")) return;
    if (!confirm("Sério mesmo? Confirme.")) return;
    deleteServer.mutate(void 0, {
      onSuccess: () => router.navigate({ to: "/app/servers" })
    });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsx(Card, { className: "overflow-hidden bg-gradient-to-br from-slate-900/50 to-background", children: /* @__PURE__ */ jsxs("div", { className: "relative h-48 sm:h-56 bg-slate-950/30", children: [
      server.banner_url ? /* @__PURE__ */ jsx("img", { src: server.banner_url, alt: "banner", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-emerald-950/15" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 bottom-0 px-5 pb-5", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-end gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center text-2xl font-bold text-white/90 shadow-xl", children: server.icon_url ? /* @__PURE__ */ jsx("img", { src: server.icon_url, alt: "Ícone do servidor", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("span", { children: server.name[0]?.toUpperCase() }) }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 text-white flex-1", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-2xl sm:text-3xl font-bold leading-tight", children: server.name }),
          /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-white/75 line-clamp-2", children: server.description || "Personalize seu servidor com banner, descrição e configurações avançadas." }),
          /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap gap-2.5", children: [
            /* @__PURE__ */ jsx(Badge, { variant: "outline", className: "border-white/30 text-white/90 bg-white/10 backdrop-blur-sm font-medium", children: server.privacy === "private" ? "🔒 Privado" : "🌐 Público" }),
            /* @__PURE__ */ jsxs(Badge, { variant: "outline", className: "border-white/30 text-white/90 bg-white/10 backdrop-blur-sm font-medium", children: [
              "👥 ",
              server.member_count,
              " ",
              server.member_count === 1 ? "membro" : "membros"
            ] })
          ] })
        ] })
      ] }) })
    ] }) }),
    serverXP && /* @__PURE__ */ jsxs(Card, { className: "p-4 border border-border/70 bg-card/80", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold", children: "XP no servidor" }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            "Seu progresso atual no servidor ",
            server.name,
            "."
          ] })
        ] }),
        /* @__PURE__ */ jsx(LevelBadge, { xp: xpCurrent, size: "md" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-4 grid gap-3 sm:grid-cols-[1fr_auto] items-center", children: [
        /* @__PURE__ */ jsx(ProgressBar, { value: xpTowardsNext, max: xpNextThreshold, label: `Nível ${xpLevel} → ${xpLevel + 1}` }),
        /* @__PURE__ */ jsxs("div", { className: "text-right text-xs text-muted-foreground", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            "XP atual: ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: xpCurrent })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            "Faltam: ",
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: xpNextThreshold - xpTowardsNext }),
            " XP"
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-6 lg:grid-cols-[2fr_1.2fr]", children: [
      /* @__PURE__ */ jsxs(Card, { className: "p-6 space-y-6 border border-border/80 bg-card/80 backdrop-blur-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-lg font-semibold", children: "Informações principais" }),
          /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Atualize nome, descrição e visibilidade do servidor." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-4 sm:grid-cols-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-sm font-semibold", children: "Nome do servidor" }),
            /* @__PURE__ */ jsx(Input, { value: editName, onChange: (e) => setEditName(e.target.value), maxLength: 48, className: "h-11 text-sm", placeholder: "Nome do servidor" }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
              editName.length,
              "/48 caracteres"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-sm font-semibold", children: "Slug público" }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex-1 rounded-lg border border-border bg-background/80 px-4 py-2.5 text-xs text-muted-foreground font-mono truncate", children: [
                "panela.app/s/",
                server.slug || "seu-slug"
              ] }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  onClick: () => updateServer.mutate({ slug: slugify(newSlug) }, {
                    onSuccess: () => onServerUpdate({ ...server, slug: slugify(newSlug) })
                  }),
                  disabled: updateServer.isPending || !newSlug.trim() || slugify(newSlug) === server.slug,
                  size: "sm",
                  className: "h-11 px-4",
                  children: "Salvar"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-sm font-semibold", children: "Descrição" }),
          /* @__PURE__ */ jsx(
            "textarea",
            {
              value: editDesc,
              onChange: (e) => setEditDesc(e.target.value),
              maxLength: 500,
              rows: 5,
              className: "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none",
              placeholder: "Descreva seu servidor, sua comunidade e o que a torna especial..."
            }
          ),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            editDesc.length,
            "/500 caracteres"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsx(Label, { className: "text-sm font-semibold", children: "Visibilidade" }),
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-3", children: ["public", "private"].map((v) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setEditPrivacy(v),
              className: `rounded-xl border-2 p-4 text-sm font-semibold transition-all duration-200 ${editPrivacy === v ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20" : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:bg-accent/20"}`,
              children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2", children: [
                v === "public" ? /* @__PURE__ */ jsx(Globe, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(Lock, { className: "h-5 w-5" }),
                v === "public" ? "Público" : "Privado"
              ] })
            },
            v
          )) }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: editPrivacy === "public" ? "Qualquer pessoa pode descobrir e entrar no seu servidor" : "Apenas convites podem entrar" })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            onClick: () => updateServer.mutate({ name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy }, {
              onSuccess: () => onServerUpdate({ ...server, name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy })
            }),
            disabled: updateServer.isPending,
            className: "w-full h-11 text-base font-semibold",
            children: updateServer.isPending ? "Salvando..." : "Salvar alterações"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium mb-1", children: "💡 Dica" }),
          /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Um banner atraente e uma descrição clara ajudam novos membros a entender o estilo e propósito da sua comunidade." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        canManage && /* @__PURE__ */ jsxs(Card, { className: "p-6 space-y-4 border border-border/80 bg-card/80 backdrop-blur-sm", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold", children: "🎨 Branding" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Customize a aparência do seu servidor." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "rounded-lg overflow-hidden border border-border bg-slate-950/5", children: server.banner_url ? /* @__PURE__ */ jsx("img", { src: server.banner_url, alt: "Banner do servidor", className: "h-32 w-full object-cover" }) : /* @__PURE__ */ jsx("div", { className: "h-32 w-full bg-gradient-to-br from-primary/10 to-slate-100 grid place-items-center text-sm text-muted-foreground", children: /* @__PURE__ */ jsxs("div", { className: "text-center", children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Sem banner" }),
            /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/60 mt-1", children: "Adicione uma imagem de 1200×400" })
          ] }) }) }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3", children: [
            /* @__PURE__ */ jsx(Button, { onClick: () => bannerRef.current?.click(), className: "h-10 font-medium", children: "Mudar banner" }),
            server.banner_url && /* @__PURE__ */ jsx(Button, { variant: "outline", className: "h-10", onClick: async () => {
              await supabase.from("servers").update({ banner_url: null }).eq("id", serverId);
              onServerUpdate({ ...server, banner_url: null });
              toast.success("Banner removido");
            }, children: "Remover banner" })
          ] }),
          /* @__PURE__ */ jsxs(
            "div",
            {
              onDragOver: (e) => {
                e.preventDefault();
                setDragOver(true);
              },
              onDragLeave: () => setDragOver(false),
              onDrop,
              onClick: () => fileRef.current?.click(),
              className: `relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-background hover:bg-primary/5"}`,
              children: [
                /* @__PURE__ */ jsx("div", { className: "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/15 text-primary", children: /* @__PURE__ */ jsx(Upload, { className: "h-6 w-6" }) }),
                /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: "Clique ou arraste para trocar o ícone" }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: "PNG/JPG/GIF até 10MB" }),
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "file",
                    ref: fileRef,
                    className: "hidden",
                    accept: "image/*",
                    onChange: (e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadIcon(f);
                      e.target.value = "";
                    }
                  }
                )
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Card, { className: "p-6 space-y-4 border border-border/80 bg-card/80 backdrop-blur-sm", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold", children: "📊 Informações" }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-3", children: [
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-background/60 p-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs font-medium uppercase tracking-wide", children: "Data de criação" }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 font-semibold text-sm", children: new Date(server.created_at).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-background/60 p-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs font-medium uppercase tracking-wide", children: "Membros ativos" }),
              /* @__PURE__ */ jsxs("p", { className: "mt-2 font-semibold text-sm", children: [
                server.member_count,
                " ",
                server.member_count === 1 ? "membro" : "membros"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border bg-background/60 p-4", children: [
              /* @__PURE__ */ jsx("p", { className: "text-muted-foreground text-xs font-medium uppercase tracking-wide", children: "ID do servidor" }),
              /* @__PURE__ */ jsx("p", { className: "mt-2 font-mono text-xs text-muted-foreground/80 break-all", children: serverId })
            ] })
          ] })
        ] }),
        isOwner && /* @__PURE__ */ jsxs(Card, { className: "rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-sm font-semibold text-destructive/90", children: "⚠️ Zona de Perigo" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: "Deletar o servidor remove todos os canais, mensagens e arquivos permanentemente. Esta ação é irreversível!" }),
          /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: handleDelete, disabled: deleteServer.isPending, className: "w-full h-10 font-semibold", children: deleteServer.isPending ? "Deletando..." : "Deletar servidor" })
        ] })
      ] })
    ] })
  ] });
}
function formatRelativeDate(value) {
  if (!value) return "Sem data";
  return new Date(value).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function ServerMembersTab({
  server,
  serverId,
  canManage,
  canKick,
  members,
  kickMember,
  presence,
  isOwner
}) {
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSort, setMemberSort] = useState("level");
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [muteHours, setMuteHours] = useState("");
  const { data: allRoles = [], isLoading: rolesLoading } = useServerRoles(serverId);
  const { data: memberRoleMap = /* @__PURE__ */ new Map(), isLoading: rolesMapLoading } = useMemberRoleMap(serverId);
  const { data: bans = [] } = useServerBans(serverId);
  const { data: mutes = [] } = useServerMutes(serverId);
  const kickMutation = useKickMember(serverId);
  const banMutation = useBanMember(serverId);
  const muteMutation = useMuteMember(serverId);
  const unbanMutation = useUnbanMember(serverId);
  const unmuteMutation = useUnmuteMember(serverId);
  const assignRole = useAssignRole(serverId);
  const removeRole = useRemoveRole(serverId);
  const updateLevel = useUpdateMemberLevel(serverId);
  const effectiveMembers = members ?? [];
  if (rolesLoading || rolesMapLoading) {
    return /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
      /* @__PURE__ */ jsx(Skeleton, { className: "h-9 w-full rounded-lg" }),
      [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-14 w-full rounded-lg" }, i))
    ] });
  }
  const sortedMembers = [...effectiveMembers].sort((a, b) => {
    if (a.user_id === server?.owner_id) return -1;
    if (b.user_id === server?.owner_id) return 1;
    if (memberSort === "online") {
      const aOn = presence.get(a.user_id) != null && presence.get(a.user_id) !== "offline";
      const bOn = presence.get(b.user_id) != null && presence.get(b.user_id) !== "offline";
      if (aOn !== bOn) return aOn ? -1 : 1;
    }
    if (memberSort === "level" || memberSort === "online") return (b.level ?? 0) - (a.level ?? 0);
    const na = a.profiles?.display_name || a.profiles?.username || "";
    const nb = b.profiles?.display_name || b.profiles?.username || "";
    return na.localeCompare(nb);
  });
  const filteredMembers = sortedMembers.filter((m) => {
    if (!memberSearch) return true;
    const p = m.profiles;
    return p?.username?.toLowerCase().includes(memberSearch.toLowerCase()) || p?.display_name?.toLowerCase().includes(memberSearch.toLowerCase());
  });
  const handleKick = (userId) => {
    if (kickMember) return kickMember(userId);
    kickMutation.mutate(userId);
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
        /* @__PURE__ */ jsx(Input, { value: memberSearch, onChange: (e) => setMemberSearch(e.target.value), placeholder: "Buscar membros...", className: "pl-8 h-9 text-sm" })
      ] }),
      /* @__PURE__ */ jsxs(Select, { value: memberSort, onValueChange: setMemberSort, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "w-[120px] h-9 text-xs", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "level", children: "Nível" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "name", children: "Nome" }),
          /* @__PURE__ */ jsx(SelectItem, { value: "online", children: "Online" })
        ] })
      ] })
    ] }),
    filteredMembers.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center py-10 text-muted-foreground/60", children: [
      /* @__PURE__ */ jsx(Users, { className: "h-7 w-7 mb-2 opacity-40" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: memberSearch ? "Ninguém encontrado" : "Nenhum membro" })
    ] }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-[min(60vh,520px)] max-h-[calc(100vh-280px)] -mx-1 px-1", children: /* @__PURE__ */ jsx("div", { className: "space-y-3", children: filteredMembers.map((m) => {
      const p = m.profiles;
      const status = presence.get(m.user_id);
      const online = status != null && status !== "offline";
      const assignedRoles = memberRoleMap.get(m.user_id) ?? [];
      return /* @__PURE__ */ jsx("div", { className: "rounded-2xl border border-border bg-card p-3", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-start", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative shrink-0", children: [
            /* @__PURE__ */ jsxs(Avatar, { className: "h-10 w-10 ring-1 ring-border/25", children: [
              /* @__PURE__ */ jsx(AvatarImage, { src: p?.avatar_url ?? void 0 }),
              /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px]", children: p?.username?.[0]?.toUpperCase() ?? "?" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: `absolute -bottom-px -right-px h-[10px] w-[10px] rounded-full border-[2px] border-card ${online ? status === "idle" ? "bg-yellow-500" : status === "dnd" ? "bg-red-500" : "bg-emerald-500" : "bg-muted-foreground/30"}` })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold truncate", children: p?.display_name || p?.username }),
              m.user_id === server.owner_id && /* @__PURE__ */ jsx(Crown, { className: "h-4 w-4 text-yellow-500" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/70", children: [
              /* @__PURE__ */ jsx("span", { children: online ? "Online" : "Offline" }),
              /* @__PURE__ */ jsx("span", { children: "·" }),
              /* @__PURE__ */ jsxs("span", { children: [
                "Nv. ",
                m.level
              ] }),
              p?.status_text && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("span", { children: "·" }),
                /* @__PURE__ */ jsxs("span", { className: "truncate italic max-w-[160px]", children: [
                  '"',
                  p.status_text,
                  '"'
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-2 flex flex-wrap gap-2", children: assignedRoles.map((rid) => {
              const role = allRoles.find((rl) => rl.id === rid);
              if (!role) return null;
              return /* @__PURE__ */ jsx(
                "span",
                {
                  className: "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-medium",
                  style: { backgroundColor: role.color ? `${role.color}18` : void 0, color: role.color || void 0, borderColor: role.color ? `${role.color}55` : void 0 },
                  children: role.name
                },
                rid
              );
            }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 md:items-end md:justify-between", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            canManage && m.user_id !== server.owner_id && /* @__PURE__ */ jsxs(Popover, { children: [
              /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-9 w-9 text-muted-foreground/40 hover:text-foreground hover:bg-accent/50", children: /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4" }) }) }),
              /* @__PURE__ */ jsxs(PopoverContent, { align: "end", side: "left", className: "w-56 p-2", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold text-muted-foreground mb-2", children: "Atribuir cargos" }),
                /* @__PURE__ */ jsx("div", { className: "space-y-1 max-h-52 overflow-y-auto", children: allRoles.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/70", children: "Crie cargos na aba Cargos para usá-los aqui." }) : allRoles.map((role) => {
                  const has = assignedRoles.includes(role.id);
                  return /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      className: "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs hover:bg-accent/60",
                      onClick: () => {
                        if (has) removeRole.mutate({ memberId: m.id, roleId: role.id });
                        else assignRole.mutate({ memberId: m.id, roleId: role.id });
                      },
                      children: [
                        /* @__PURE__ */ jsx("span", { className: `h-3 w-3 rounded-full ${has ? "bg-primary" : "border border-muted-foreground/30"}` }),
                        /* @__PURE__ */ jsx("span", { className: "truncate", children: role.name })
                      ]
                    },
                    role.id
                  );
                }) })
              ] })
            ] }),
            canManage && m.user_id !== server.owner_id && /* @__PURE__ */ jsxs(Select, { value: String(m.level), onValueChange: (value) => updateLevel.mutate({ userId: m.user_id, level: Number(value) }), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "h-9 min-w-[130px] text-xs", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "1", children: "Membro" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "60", children: "Moderador" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "80", children: "Gerente" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "99", children: "Proprietário" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
            canManage && m.user_id !== server.owner_id && /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx(
                ResponsiveDialog,
                {
                  title: "Silenciar membro",
                  trigger: /* @__PURE__ */ jsxs(Button, { variant: "outline", size: "sm", className: "h-9 text-xs", children: [
                    /* @__PURE__ */ jsx(VolumeX, { className: "h-3.5 w-3.5" }),
                    " Silenciar"
                  ] }),
                  children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                    /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                      "Silenciar ",
                      /* @__PURE__ */ jsx("strong", { children: p?.display_name || p?.username })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Motivo" }),
                      /* @__PURE__ */ jsx(Input, { value: muteReason, onChange: (e) => setMuteReason(e.target.value), className: "h-9 text-sm", placeholder: "Opcional" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Duração (horas)" }),
                      /* @__PURE__ */ jsx(Input, { value: muteHours, onChange: (e) => setMuteHours(e.target.value), className: "h-9 text-sm", placeholder: "Permanente se vazio" })
                    ] }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        onClick: () => {
                          muteMutation.mutate({ userId: m.user_id, reason: muteReason, hours: muteHours });
                          setMuteReason("");
                          setMuteHours("");
                        },
                        variant: "destructive",
                        className: "w-full h-9 text-xs",
                        children: "Silenciar"
                      }
                    )
                  ] })
                }
              ),
              /* @__PURE__ */ jsx(
                ResponsiveDialog,
                {
                  title: "Banir membro",
                  trigger: /* @__PURE__ */ jsxs(Button, { variant: "destructive", size: "sm", className: "h-9 text-xs", children: [
                    /* @__PURE__ */ jsx(Ban, { className: "h-3.5 w-3.5" }),
                    " Banir"
                  ] }),
                  children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
                    /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                      "Banir ",
                      /* @__PURE__ */ jsx("strong", { children: p?.display_name || p?.username })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Motivo" }),
                      /* @__PURE__ */ jsx(Input, { value: banReason, onChange: (e) => setBanReason(e.target.value), className: "h-9 text-sm", placeholder: "Opcional" })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                      /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Duração (horas)" }),
                      /* @__PURE__ */ jsx(Input, { value: banHours, onChange: (e) => setBanHours(e.target.value), className: "h-9 text-sm", placeholder: "Permanente se vazio" })
                    ] }),
                    /* @__PURE__ */ jsx(
                      Button,
                      {
                        onClick: () => {
                          banMutation.mutate({ userId: m.user_id, reason: banReason, hours: banHours });
                          setBanReason("");
                          setBanHours("");
                        },
                        variant: "destructive",
                        className: "w-full h-9 text-xs",
                        children: "Banir"
                      }
                    )
                  ] })
                }
              )
            ] }),
            canKick && m.user_id !== server.owner_id && /* @__PURE__ */ jsx(
              Button,
              {
                variant: "outline",
                size: "sm",
                className: "h-9 text-xs text-destructive border-destructive hover:bg-destructive/10",
                onClick: () => {
                  if (confirm("Remover este membro?")) handleKick(m.user_id);
                },
                children: "Remover"
              }
            )
          ] })
        ] })
      ] }) }, m.user_id);
    }) }) }),
    canManage && /* @__PURE__ */ jsxs("div", { className: "grid gap-3 xl:grid-cols-2", children: [
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-card p-4 space-y-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between gap-4", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground/70", children: "Banimentos ativos" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/70", children: "Gerencie quem está banido do servidor" })
        ] }) }),
        bans.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/60", children: "Sem banimentos ativos." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: bans.map((ban) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border p-3 bg-muted/30 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: ban.profiles?.display_name || ban.profiles?.username || "Usuário" }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/70", children: ban.reason || "Sem motivo" }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60", children: [
              "Expira: ",
              ban.expires_at ? formatRelativeDate(ban.expires_at) : "Permanente"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => unbanMutation.mutate(ban.id), children: "Desbanir" })
        ] }, ban.id)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "rounded-2xl border border-border bg-card p-4 space-y-3", children: [
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between gap-4", children: /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h4", { className: "text-xs font-semibold uppercase tracking-widest text-muted-foreground/70", children: "Silenciamentos" }),
          /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/70", children: "Veja e remova silenciamentos ativos" })
        ] }) }),
        mutes.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/60", children: "Sem silenciamentos ativos." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: mutes.map((mute) => /* @__PURE__ */ jsxs("div", { className: "rounded-xl border border-border p-3 bg-muted/30 flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: mute.profiles?.display_name || mute.profiles?.username || "Usuário" }),
            /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/70", children: mute.reason || "Sem motivo" }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60", children: [
              "Expira: ",
              mute.expires_at ? formatRelativeDate(mute.expires_at) : "Permanente"
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { size: "sm", variant: "outline", onClick: () => unmuteMutation.mutate(mute.id), children: "Remover silêncio" })
        ] }, mute.id)) })
      ] })
    ] })
  ] });
}
const channelMeta$1 = (type) => {
  switch (type) {
    case "voice":
      return { icon: Volume2, color: "text-emerald-500" };
    case "announcement":
      return { icon: MessageSquare, color: "text-amber-500" };
    case "rules":
      return { icon: ScrollText, color: "text-rose-500" };
    case "forum":
      return { icon: MessageSquareText, color: "text-violet-500" };
    default:
      return { icon: Hash, color: "text-primary/70" };
  }
};
function ChannelItem$1({ channel, canManage, onEdit, onDelete }) {
  const { icon: ChanIcon, color: chanColor } = channelMeta$1(channel.type);
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-all group", children: [
    canManage && /* @__PURE__ */ jsx(GripVertical, { className: "h-3.5 w-3.5 text-muted-foreground/20 cursor-grab active:cursor-grabbing" }),
    /* @__PURE__ */ jsx("div", { className: `h-7 w-7 rounded-md grid place-items-center ${chanColor.replace("text-", "bg-").replace("500", "500/15")}`, children: /* @__PURE__ */ jsx(ChanIcon, { className: `h-3.5 w-3.5 ${chanColor}` }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate text-foreground", children: channel.name }),
      channel.topic && /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/60 truncate", children: channel.topic })
    ] }),
    canManage && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onEdit,
          className: "p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all",
          title: "Editar canal",
          children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" })
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: onDelete,
          className: "p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all",
          title: "Deletar canal",
          children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" })
        }
      )
    ] })
  ] });
}
function CategoryGroup({ name, channels, canManage, onEdit, onDelete }) {
  const [collapsed, setCollapsed] = useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        onClick: () => setCollapsed((p) => !p),
        className: "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent/20 transition-all text-sm font-medium text-foreground/70 group",
        children: [
          collapsed ? /* @__PURE__ */ jsx(ChevronRight, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx(Folder, { className: "h-3.5 w-3.5 text-primary/60" }),
          /* @__PURE__ */ jsx("span", { className: "flex-1 text-left", children: name }),
          /* @__PURE__ */ jsx("span", { className: "text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition", children: channels.length })
        ]
      }
    ),
    !collapsed && /* @__PURE__ */ jsx("div", { className: "space-y-0.5 pl-4 border-l border-border/40", children: channels.map((c) => /* @__PURE__ */ jsx(
      ChannelItem$1,
      {
        channel: c,
        canManage,
        onEdit: () => onEdit(c),
        onDelete: () => onDelete(c)
      },
      c.id
    )) })
  ] });
}
function ServerChannelsTab({ serverId, canManage }) {
  const { data: channels = [], isLoading } = useServerChannels(serverId);
  const updateChannel = useUpdateChannel(serverId);
  const deleteChannel = useDeleteChannel(serverId);
  const [editingChannel, setEditingChannel] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMinLevel, setEditMinLevel] = useState(1);
  const [editCategory, setEditCategory] = useState("");
  const grouped = /* @__PURE__ */ new Map();
  const uncategorized = [];
  for (const c of channels) {
    if (c.category) {
      if (!grouped.has(c.category)) grouped.set(c.category, []);
      grouped.get(c.category).push(c);
    } else {
      uncategorized.push(c);
    }
  }
  async function saveChannel() {
    if (!editingChannel) return;
    updateChannel.mutate({
      id: editingChannel.id,
      name: editName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32),
      topic: editTopic.trim() || null,
      description: editDesc.trim() || null,
      min_level: editMinLevel,
      category: editCategory.trim() || null
    });
    setEditingChannel(null);
  }
  function openEdit(c) {
    setEditingChannel(c);
    setEditName(c.name);
    setEditTopic(c.topic ?? "");
    setEditDesc(c.description ?? "");
    setEditMinLevel(c.min_level ?? 1);
    setEditCategory(c.category ?? "");
  }
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "space-y-2", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-10 w-full rounded-lg" }, i)) });
  }
  if (!channels.length) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center py-12 text-muted-foreground/60", children: [
      /* @__PURE__ */ jsx(FolderOpen, { className: "h-10 w-10 mb-3 opacity-20" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium", children: "Nenhum canal criado" }),
      /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/50 mt-1", children: "Comece criando canais de texto ou voz" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
    /* @__PURE__ */ jsx(ScrollArea, { className: "h-[420px] -mx-1 px-1", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2 pr-3", children: [
      Array.from(grouped.entries()).map(([catName, catChannels]) => /* @__PURE__ */ jsx(
        CategoryGroup,
        {
          name: catName,
          channels: catChannels,
          canManage,
          onEdit: openEdit,
          onDelete: (c) => {
            if (confirm("Deletar este canal permanentemente?")) deleteChannel.mutate(c.id);
          }
        },
        catName
      )),
      uncategorized.length > 0 && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx("div", { className: "px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground/50 font-medium", children: "Sem categoria" }),
        /* @__PURE__ */ jsx("div", { className: "space-y-0.5", children: uncategorized.map((c) => /* @__PURE__ */ jsx(
          ChannelItem$1,
          {
            channel: c,
            canManage,
            onEdit: () => openEdit(c),
            onDelete: () => {
              if (confirm("Deletar este canal permanentemente?")) deleteChannel.mutate(c.id);
            }
          },
          c.id
        )) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(ResponsiveDialog, { open: !!editingChannel, onOpenChange: (v) => {
      if (!v) setEditingChannel(null);
    }, title: "Editar canal", className: "max-w-md", children: editingChannel && /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Nome do canal" }),
        /* @__PURE__ */ jsx(Input, { value: editName, onChange: (e) => setEditName(e.target.value), className: "h-10 text-sm", maxLength: 32 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Tópico" }),
        /* @__PURE__ */ jsx(Input, { value: editTopic, onChange: (e) => setEditTopic(e.target.value), className: "h-10 text-sm", maxLength: 128, placeholder: "Assunto do canal..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Descrição" }),
        /* @__PURE__ */ jsx(Input, { value: editDesc, onChange: (e) => setEditDesc(e.target.value), className: "h-10 text-sm", maxLength: 300, placeholder: "Descrição detalhada..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
        /* @__PURE__ */ jsx(Label, { className: "text-xs font-semibold", children: "Categoria" }),
        /* @__PURE__ */ jsx(Input, { value: editCategory, onChange: (e) => setEditCategory(e.target.value), className: "h-10 text-sm", placeholder: "ex: Geral, Voz, Desenvolvimento..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsxs(Label, { className: "text-xs font-semibold", children: [
            "Nível mínimo: ",
            editMinLevel
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-muted-foreground", children: [
            "Lvl ",
            editMinLevel,
            "+"
          ] })
        ] }),
        /* @__PURE__ */ jsx("input", { type: "range", min: 1, max: 99, value: editMinLevel, onChange: (e) => setEditMinLevel(Number(e.target.value)), className: "w-full accent-primary cursor-pointer" })
      ] }),
      /* @__PURE__ */ jsx(Button, { onClick: saveChannel, className: "w-full h-10 text-sm font-medium", children: "Salvar alterações" })
    ] }) })
  ] });
}
function ServerEventsDialog({ serverId, canManage }) {
  const [events, setEvents] = useState([]);
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");
  function load() {
    supabase.from("server_events").select("*").eq("server_id", serverId).order("starts_at", { ascending: true }).then(({ data }) => {
      setEvents(data ?? []);
    });
  }
  useEffect(() => {
    if (open) load();
  }, [open, serverId]);
  async function create() {
    if (!newTitle.trim() || !newDate) return;
    const { error } = await supabase.from("server_events").insert({
      server_id: serverId,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      starts_at: newDate,
      created_by: (await supabase.auth.getSession()).data.session?.user.id || ""
    });
    if (error) return toast.error(error.message);
    setNewTitle("");
    setNewDesc("");
    setNewDate("");
    toast.success("Evento criado!");
    load();
  }
  async function remove(id) {
    if (!confirm("Excluir evento?")) return;
    await supabase.from("server_events").delete().eq("id", id);
    load();
  }
  return /* @__PURE__ */ jsx(
    ResponsiveDialog,
    {
      open,
      onOpenChange: setOpen,
      title: "Eventos",
      trigger: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", children: [
        /* @__PURE__ */ jsx(CalendarDays, { className: "h-4 w-4 mr-1" }),
        "Eventos"
      ] }),
      children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        canManage && /* @__PURE__ */ jsxs("div", { className: "rounded-lg border border-border p-3 space-y-2", children: [
          /* @__PURE__ */ jsx(Input, { value: newTitle, onChange: (e) => setNewTitle(e.target.value), placeholder: "Título do evento", className: "h-9" }),
          /* @__PURE__ */ jsx(Textarea, { value: newDesc, onChange: (e) => setNewDesc(e.target.value), placeholder: "Descrição (opcional)", rows: 2 }),
          /* @__PURE__ */ jsx(Label, { children: "Data" }),
          /* @__PURE__ */ jsx(Input, { type: "datetime-local", value: newDate, onChange: (e) => setNewDate(e.target.value), className: "h-9" }),
          /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: create, className: "w-full", children: [
            /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1" }),
            "Criar evento"
          ] })
        ] }),
        events.map((ev) => /* @__PURE__ */ jsx("div", { className: "rounded-lg border border-border p-3", children: /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("p", { className: "font-medium text-sm", children: ev.title }),
            /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground flex items-center gap-1 mt-0.5", children: [
              /* @__PURE__ */ jsx(Calendar, { className: "h-3 w-3" }),
              " ",
              new Date(ev.starts_at).toLocaleString("pt-BR")
            ] }),
            ev.description && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground mt-1", children: ev.description })
          ] }),
          canManage && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7 text-destructive shrink-0", onClick: () => remove(ev.id), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
        ] }) }, ev.id)),
        !events.length && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground text-center py-4", children: "Nenhum evento agendado" })
      ] })
    }
  );
}
function InvitesDialog({ serverId, canManage }) {
  const [invites, setInvites] = useState([]);
  const [open, setOpen] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [expiresH, setExpiresH] = useState("");
  function load() {
    supabase.from("invites").select("*").eq("server_id", serverId).then(({ data }) => setInvites(data ?? []));
  }
  async function create() {
    const code = crypto.randomUUID().slice(0, 8);
    const expires = expiresH ? new Date(Date.now() + Number(expiresH) * 36e5).toISOString() : null;
    const { error } = await supabase.from("invites").insert({
      server_id: serverId,
      code,
      created_by: (await supabase.auth.getSession()).data.session?.user.id || "",
      max_uses: maxUses ? Number(maxUses) : null,
      expires_at: expires
    });
    if (error) toast.error(error.message);
    else {
      load();
      setMaxUses("");
      setExpiresH("");
    }
  }
  async function removeInvite(id) {
    await supabase.from("invites").delete().eq("id", id);
    load();
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return /* @__PURE__ */ jsx(
    ResponsiveDialog,
    {
      open,
      onOpenChange: (o) => {
        setOpen(o);
        if (o) load();
      },
      title: "Convites",
      trigger: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", disabled: !canManage, children: [
        /* @__PURE__ */ jsx(Link2, { className: "h-4 w-4 mr-1" }),
        "Convites"
      ] }),
      children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        canManage && /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-2 items-stretch sm:items-end", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-1", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Max usos" }),
            /* @__PURE__ */ jsx(Input, { value: maxUses, onChange: (e) => setMaxUses(e.target.value), placeholder: "Ilimitado", className: "h-9" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-1", children: [
            /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Expirar em (horas)" }),
            /* @__PURE__ */ jsx(Input, { value: expiresH, onChange: (e) => setExpiresH(e.target.value), placeholder: "Nunca", className: "h-9" })
          ] }),
          /* @__PURE__ */ jsxs(Button, { size: "sm", onClick: create, className: "sm:h-9", children: [
            /* @__PURE__ */ jsx(RefreshCw, { className: "h-3 w-3 mr-1" }),
            "Criar"
          ] })
        ] }),
        invites.map((inv) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border px-3 py-2.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 mr-2", children: [
            /* @__PURE__ */ jsx("code", { className: "text-sm font-mono break-all", children: inv.code }),
            /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground", children: [
              inv.use_count,
              "/",
              inv.max_uses || "∞",
              " usos",
              inv.expires_at ? ` · Expira ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}` : ""
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-1 shrink-0", children: [
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => {
              navigator.clipboard.writeText(`${origin}/invite/${inv.code}`);
              toast.success("Link copiado!");
            }, children: /* @__PURE__ */ jsx(Copy, { className: "h-4 w-4" }) }),
            /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-destructive", onClick: () => removeInvite(inv.id), children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) })
          ] })
        ] }, inv.id)),
        !invites.length && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground text-center py-4", children: "Nenhum convite criado" })
      ] })
    }
  );
}
const ServerCtx_ = createContext(null);
function useServerContext() {
  return useContext(ServerCtx_);
}
function ServerLayout() {
  const {
    serverId
  } = useParams({
    from: "/app/servers/$serverId"
  });
  const {
    user
  } = useAuth();
  const router = useRouter();
  const loc = useLocation();
  const {
    data: server,
    isLoading: serverLoading,
    refetch: refetchServer
  } = useServerDetails(serverId);
  const {
    data: channels = [],
    isLoading: channelsLoading
  } = useServerChannels(serverId);
  const {
    data: memberLevel = 0
  } = useMemberLevel(serverId, user?.id);
  const createChannel = useCreateChannel(serverId);
  const deleteChannelMut = useDeleteChannel(serverId);
  const updateChannel = useUpdateChannel(serverId);
  const reorderChannels = useReorderChannels(serverId);
  const kickMutation = useKickMember(serverId);
  useServerRealtime(serverId);
  const [presence, setPresence] = useState(/* @__PURE__ */ new Map());
  usePresenceChannel(serverId, user?.id, useCallback((m) => setPresence(m), []));
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newCategory, setNewCategory] = useState("");
  const [mobileChannelsOpen, setMobileChannelsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collapsedCats, setCollapsedCats] = useState(/* @__PURE__ */ new Set());
  const [toolsOpen, setToolsOpen] = useState(false);
  useEffect(() => {
    setMobileChannelsOpen(false);
  }, [loc.pathname]);
  useEffect(() => {
    if (server && channels.length > 0 && loc.pathname === `/app/servers/${serverId}`) {
      const first = channels.find((c) => c.type === "text") ?? channels[0];
      router.navigate({
        to: "/app/servers/$serverId/$channelId",
        params: {
          serverId,
          channelId: first.id
        },
        replace: true
      });
    }
  }, [server?.id, channels.length, loc.pathname]);
  useEffect(() => {
    if (server && !memberLevel && server.owner_id === user?.id) {
      supabase.from("server_members").upsert({
        server_id: serverId,
        user_id: user.id,
        level: 99
      }, {
        onConflict: "server_id, user_id",
        ignoreDuplicates: true
      }).then(() => {
        refetchServer();
      });
    }
  }, [server?.id, memberLevel]);
  if (serverLoading || !server) return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm p-8 bg-gradient-to-b from-transparent to-card/10", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
    /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" }),
    /* @__PURE__ */ jsx("span", { children: "Carregando servidor…" })
  ] }) });
  const canManage = memberLevel >= 80;
  const isOwner = server.owner_id === user?.id;
  const canKick = memberLevel >= 60;
  const sortedChannels = [...channels].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const categories = /* @__PURE__ */ new Map();
  const uncategorized = [];
  sortedChannels.forEach((c) => {
    if (c.category) {
      const arr = categories.get(c.category) ?? [];
      arr.push(c);
      categories.set(c.category, arr);
    } else {
      uncategorized.push(c);
    }
  });
  const toggleCat = (cat) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };
  const addChannel = () => {
    if (!newName.trim()) return;
    const slug = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32);
    createChannel.mutate({
      name: slug,
      type: newType,
      position: channels.length,
      category: newCategory.trim() || null
    });
    setOpen(false);
    setNewName("");
    setNewCategory("");
  };
  const deleteChannel = (channelId) => {
    if (!confirm("Deletar este canal permanentemente?")) return;
    deleteChannelMut.mutate(channelId);
  };
  const kickMember = (targetUserId) => {
    if (!confirm("Remover este membro?")) return;
    kickMutation.mutate(targetUserId);
  };
  const leave = async () => {
    if (!user) return;
    if (!confirm("Sair desta panela?")) return;
    await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", user.id);
    router.navigate({
      to: "/app/servers"
    });
  };
  const ctx = {
    server,
    presence,
    channels,
    categories,
    uncategorized,
    collapsedCats,
    toggleCat,
    mobileChannelsOpen,
    setMobileChannelsOpen,
    memberLevel,
    canManage,
    isOwner,
    addChannel: () => addChannel(),
    deleteChannel: (id) => deleteChannel(id),
    open,
    setOpen,
    newName,
    setNewName,
    newType,
    setNewType,
    newCategory,
    setNewCategory
  };
  const onlineCount = Array.from(presence.values()).filter((s) => s !== "offline").length;
  const inChannel = loc.pathname.match(/^\/app\/servers\/[^/]+\/[^/]+$/);
  const currentChannelId = inChannel ? loc.pathname.split("/").pop() : "";
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0", children: [
    /* @__PURE__ */ jsxs("aside", { className: "hidden md:flex w-64 flex-col border-r border-border bg-sidebar/95 shrink-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "p-3 border-b border-sidebar-border flex items-center gap-2.5", children: [
        server.icon_url ? /* @__PURE__ */ jsx("img", { src: server.icon_url, alt: "", className: "h-9 w-9 rounded-xl object-cover ring-2 ring-sidebar-border/60" }) : /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-xl bg-gradient-to-br from-primary/40 to-primary/10 ring-2 ring-sidebar-border/60 grid place-items-center font-bold text-primary text-sm", children: server.name[0]?.toUpperCase() }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold truncate text-sm leading-tight", children: server.name }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mt-px", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-muted-foreground/70 flex items-center gap-1", children: [
              server.privacy === "private" ? /* @__PURE__ */ jsx(Lock, { className: "h-2.5 w-2.5" }) : /* @__PURE__ */ jsx(Globe, { className: "h-2.5 w-2.5" }),
              server.member_count,
              " ",
              server.member_count === 1 ? "membro" : "membros",
              /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/30 mx-0.5", children: "·" }),
              onlineCount > 0 ? `${onlineCount} online` : "nenhum online"
            ] }),
            server.slug && /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-muted-foreground/40", children: [
              "· @",
              server.slug
            ] })
          ] })
        ] }),
        isOwner && server.slug && /* @__PURE__ */ jsx(SlugEdit, { slug: server.slug, serverId, onSaved: () => refetchServer() })
      ] }),
      /* @__PURE__ */ jsx(ChannelsList, { categories, uncategorized, collapsedCats, toggleCat, channels: sortedChannels, serverId, loc, canManage, open, setOpen, newName, setNewName, newType, setNewType, newCategory, setNewCategory, addChannel, deleteChannel, updateChannel, reorderChannels }),
      /* @__PURE__ */ jsx(ServerToolbar, { canManage, isOwner, serverId, server, leave, settingsOpen, setSettingsOpen, toolsOpen, setToolsOpen })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 min-h-0 flex flex-col", children: [
      !inChannel && /* @__PURE__ */ jsxs("div", { className: "md:hidden flex items-center gap-2 px-3 h-12 border-b border-border bg-sidebar/95 backdrop-blur shrink-0", children: [
        /* @__PURE__ */ jsx(Link, { to: "/app/servers", className: "md:hidden text-muted-foreground hover:text-foreground transition-colors", children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-5 w-5" }) }),
        server.icon_url ? /* @__PURE__ */ jsx("img", { src: server.icon_url, alt: "", className: "h-7 w-7 rounded-lg object-cover" }) : /* @__PURE__ */ jsx("div", { className: "h-7 w-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center font-bold text-primary text-[10px]", children: server.name[0]?.toUpperCase() }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold truncate leading-tight", children: server.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60 leading-tight", children: [
            server.member_count,
            " ",
            server.member_count === 1 ? "membro" : "membros"
          ] })
        ] }),
        /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 shrink-0", onClick: () => setSettingsOpen(true), title: "Configurações", children: /* @__PURE__ */ jsx(Settings, { className: "h-4 w-4" }) })
      ] }),
      inChannel && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { className: "md:hidden fixed bottom-20 right-4 z-30", children: /* @__PURE__ */ jsx(Button, { size: "icon", className: "h-12 w-12 rounded-full shadow-xl shadow-black/30 bg-primary text-primary-foreground hover:bg-primary/90", onClick: () => setMobileChannelsOpen(true), title: "Mudar de canal", children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" }) }) }),
        /* @__PURE__ */ jsx(Sheet, { open: mobileChannelsOpen, onOpenChange: setMobileChannelsOpen, children: /* @__PURE__ */ jsxs(SheetContent, { side: "left", className: "p-0 w-[85vw] max-w-[320px] bg-sidebar flex flex-col z-50", children: [
          /* @__PURE__ */ jsxs("div", { className: "p-3 border-b border-sidebar-border flex items-center gap-2.5", children: [
            server.icon_url ? /* @__PURE__ */ jsx("img", { src: server.icon_url, alt: "", className: "h-9 w-9 rounded-xl object-cover" }) : /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-xl bg-gradient-to-br from-primary/40 to-primary/10 grid place-items-center font-bold text-primary text-sm", children: server.name[0]?.toUpperCase() || "S" }),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsx("h2", { className: "font-semibold truncate text-sm", children: server.name }),
              /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60", children: [
                channels.length,
                " canais"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx(ScrollArea, { className: "flex-1", children: /* @__PURE__ */ jsxs("div", { className: "p-2 space-y-0.5", children: [
            uncategorized.map((c) => /* @__PURE__ */ jsx(MobileChannelLink, { c, serverId, currentId: currentChannelId }, c.id)),
            [...categories.entries()].map(([cat, chs]) => /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { className: "text-[10px] uppercase tracking-widest text-muted-foreground/50 font-semibold px-2.5 py-1.5", children: cat }),
              chs.map((c) => /* @__PURE__ */ jsx(MobileChannelLink, { c, serverId, currentId: currentChannelId }, c.id))
            ] }, cat)),
            channels.length === 0 && /* @__PURE__ */ jsx("div", { className: "p-6 text-center text-xs text-muted-foreground/50 italic", children: "Nenhum canal disponível ainda" })
          ] }) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(ServerCtx_.Provider, { value: ctx, children: /* @__PURE__ */ jsx("div", { className: "flex flex-1 min-h-0", children: /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0 min-h-0", children: /* @__PURE__ */ jsx(Outlet, {}) }) }) })
    ] }),
    /* @__PURE__ */ jsx(ResponsiveDialog, { open: settingsOpen, onOpenChange: setSettingsOpen, title: "Configurações do servidor", className: "max-h-[90dvh] overflow-hidden", contentClassName: "h-full overflow-hidden p-0", children: /* @__PURE__ */ jsx(ServerSettingsPanel, { server, serverId, isOwner, canManage, canKick, kickMember, presence, onServerUpdate: (s) => refetchServer() }) })
  ] });
}
function ChannelsList({
  categories,
  uncategorized,
  collapsedCats,
  toggleCat,
  channels,
  serverId,
  loc,
  canManage,
  open,
  setOpen,
  newName,
  setNewName,
  newType,
  setNewType,
  newCategory,
  setNewCategory,
  addChannel,
  deleteChannel,
  updateChannel,
  reorderChannels
}) {
  const [editingCat, setEditingCat] = useState(null);
  const [editingCatVal, setEditingCatVal] = useState("");
  async function renameCategory(oldName, newName2) {
    if (!oldName) return;
    const {
      error
    } = await supabase.from("channels").update({
      category: newName2 || null
    }).eq("server_id", serverId).eq("category", oldName);
    if (error) return toast.error(error.message);
    toast.success("Categoria atualizada");
  }
  async function deleteCategory(name) {
    if (!name) return;
    const {
      error
    } = await supabase.from("channels").update({
      category: null
    }).eq("server_id", serverId).eq("category", name);
    if (error) return toast.error(error.message);
    toast.success("Categoria removida");
  }
  function reorderCategoryItems(draggedId, targetCategory, targetIndex) {
    const sorted = [...channels].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const dragged = sorted.find((c) => c.id === draggedId);
    if (!dragged) return;
    const sourceCategory = dragged.category ?? null;
    const targetCategoryNormalized = targetCategory ?? null;
    const sourceItems = sorted.filter((c) => (c.category ?? null) === sourceCategory && c.id !== draggedId);
    const targetItems = sorted.filter((c) => (c.category ?? null) === targetCategoryNormalized && c.id !== draggedId);
    if (sourceCategory !== targetCategoryNormalized) {
      dragged.category = targetCategoryNormalized;
    }
    targetItems.splice(targetIndex, 0, dragged);
    const updates = [];
    targetItems.forEach((item, idx) => {
      if (item.position !== idx || item.category !== targetCategoryNormalized) {
        updates.push({
          id: item.id,
          position: idx,
          category: targetCategoryNormalized
        });
      }
    });
    if (sourceCategory !== targetCategoryNormalized) {
      sourceItems.forEach((item, idx) => {
        if (item.position !== idx) updates.push({
          id: item.id,
          position: idx,
          category: item.category ?? null
        });
      });
    }
    if (updates.length) {
      reorderChannels.mutate(updates);
      toast.success("Ordem atualizada");
    }
  }
  function onDropToCategory(e, cat, chs) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    reorderCategoryItems(id, cat, chs.length);
  }
  function onDragOverCat(e) {
    e.preventDefault();
  }
  return /* @__PURE__ */ jsx(ScrollArea, { className: "flex-1", children: /* @__PURE__ */ jsxs("div", { className: "p-2 space-y-0.5", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between px-2.5 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/50", children: [
      /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Canais" }),
      canManage && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(ResponsiveDialog, { open, onOpenChange: setOpen, title: "Novo canal", trigger: /* @__PURE__ */ jsx("button", { className: "hover:text-foreground p-0.5 rounded hover:bg-sidebar-accent/60 transition-colors", title: "Criar canal", children: /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }) }), children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Tipo" }),
            /* @__PURE__ */ jsxs(Select, { value: newType, onValueChange: (v) => setNewType(v), children: [
              /* @__PURE__ */ jsx(SelectTrigger, { className: "h-10", children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "text", children: "Texto" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "voice", children: "Voz" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "announcement", children: "Anúncios" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "rules", children: "Regras" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "forum", children: "Forum" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Nome" }),
            /* @__PURE__ */ jsx(Input, { value: newName, onChange: (e) => setNewName(e.target.value), placeholder: "nome-do-canal", className: "h-10" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
            /* @__PURE__ */ jsx(Label, { children: "Categoria (opcional)" }),
            /* @__PURE__ */ jsx(Input, { value: newCategory, onChange: (e) => setNewCategory(e.target.value), placeholder: "ex: Geral, Voz, Jogos", className: "h-10" })
          ] }),
          /* @__PURE__ */ jsx(Button, { onClick: addChannel, className: "w-full h-10", children: "Criar" })
        ] }) }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => {
          setNewCategory("");
          setOpen(true);
        }, className: "h-9 rounded-lg border border-border bg-sidebar/80 px-3 text-xs text-muted-foreground hover:border-primary hover:text-foreground transition-colors", children: "Nova categoria" })
      ] })
    ] }),
    uncategorized.map((c, idx) => /* @__PURE__ */ jsx(ChannelItem, { c, serverId, loc, canManage, deleteChannel, updateChannel, index: idx, onMove: async (draggedId, before) => {
      reorderCategoryItems(draggedId, null, before ? idx : idx + 1);
    } }, c.id)),
    [...categories.entries()].map(([cat, chs]) => /* @__PURE__ */ jsxs("div", { onDragOver: onDragOverCat, onDrop: (e) => onDropToCategory(e, cat, chs), children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 px-2.5 py-1.5", children: [
        /* @__PURE__ */ jsxs("button", { onClick: () => toggleCat(cat), className: "flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-foreground/80 transition-colors rounded-md hover:bg-sidebar-accent/30", children: [
          /* @__PURE__ */ jsx(ChevronDown, { className: `h-3 w-3 transition-transform duration-200 ${collapsedCats.has(cat) ? "-rotate-90" : ""}` }),
          /* @__PURE__ */ jsx("span", { className: "font-semibold", children: cat }),
          /* @__PURE__ */ jsx("span", { className: "ml-auto text-[9px] text-muted-foreground/40 font-mono", children: chs.length })
        ] }),
        canManage && /* @__PURE__ */ jsxs("div", { className: "ml-2 flex items-center gap-1", children: [
          /* @__PURE__ */ jsx("button", { onClick: () => {
            setEditingCat(cat);
            setEditingCatVal(cat);
          }, className: "p-1 text-muted-foreground/40 hover:text-foreground", title: "Editar categoria", children: /* @__PURE__ */ jsx(Pencil, { className: "h-3 w-3" }) }),
          /* @__PURE__ */ jsx("button", { onClick: () => deleteCategory(cat), className: "p-1 text-muted-foreground/40 hover:text-destructive", title: "Remover categoria", children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: `overflow-hidden transition-all duration-200 ${collapsedCats.has(cat) ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"}`, children: chs.map((c, idx) => /* @__PURE__ */ jsx(ChannelItem, { c, serverId, loc, canManage, deleteChannel, updateChannel, index: idx, onMove: async (draggedId, before) => {
        reorderCategoryItems(draggedId, cat, before ? idx : idx + 1);
      } }, c.id)) }),
      editingCat === cat && /* @__PURE__ */ jsx("div", { className: "px-3 py-2", children: /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Input, { value: editingCatVal, onChange: (e) => setEditingCatVal(e.target.value), className: "h-8" }),
        /* @__PURE__ */ jsx(Button, { onClick: async () => {
          await renameCategory(cat, editingCatVal.trim());
          setEditingCat(null);
        }, className: "h-8", children: "Salvar" }),
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setEditingCat(null), className: "h-8", children: "Cancelar" })
      ] }) })
    ] }, cat)),
    channels.length === 0 && /* @__PURE__ */ jsx("p", { className: "text-[11px] text-muted-foreground/40 text-center py-8", children: "Nenhum canal ainda" })
  ] }) });
}
function channelMeta(type) {
  switch (type) {
    case "voice":
      return {
        icon: Volume2,
        color: "text-emerald-500"
      };
    case "announcement":
      return {
        icon: MessageSquare,
        color: "text-amber-500"
      };
    case "rules":
      return {
        icon: ScrollText,
        color: "text-rose-500"
      };
    case "forum":
      return {
        icon: MessageSquareText,
        color: "text-violet-500"
      };
    default:
      return {
        icon: Hash,
        color: "text-primary/70"
      };
  }
}
function ChannelItem({
  c,
  serverId,
  loc,
  canManage,
  deleteChannel,
  updateChannel,
  index,
  onMove
}) {
  const active = loc.pathname === `/app/servers/${serverId}/${c.id}`;
  const {
    icon: Icon,
    color: iconColor
  } = channelMeta(c.type);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(c.name);
  const [editTopic, setEditTopic] = useState(c.topic ?? "");
  const [editDesc, setEditDesc] = useState(c.description ?? "");
  const [editMinLevel, setEditMinLevel] = useState(c.min_level ?? 1);
  async function saveChannel() {
    const {
      error
    } = await supabase.from("channels").update({
      name: editName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32),
      topic: editTopic.trim() || null,
      description: editDesc.trim() || null,
      min_level: editMinLevel
    }).eq("id", c.id);
    if (error) return toast.error(error.message);
    setEditOpen(false);
    toast.success("Canal atualizado");
  }
  return /* @__PURE__ */ jsxs("div", { className: `${active ? "relative " : ""}group`, children: [
    active && /* @__PURE__ */ jsx("span", { className: "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" }),
    /* @__PURE__ */ jsx("div", { draggable: canManage, onDragStart: (e) => {
      e.dataTransfer?.setData("text/plain", c.id);
      e.dataTransfer.effectAllowed = "move";
    }, onDragOver: (e) => {
      e.preventDefault();
    }, onDrop: (e) => {
      e.preventDefault();
      const draggedId = e.dataTransfer?.getData("text/plain");
      if (!draggedId || draggedId === c.id) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      if (typeof onMove === "function") onMove(draggedId, before);
    }, className: `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm flex-1 min-w-0 transition-all ml-1 ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"}`, children: /* @__PURE__ */ jsx(Link, { to: "/app/servers/$serverId/$channelId", params: {
      serverId,
      channelId: c.id
    }, className: "flex-1 min-w-0", children: /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Icon, { className: `h-4 w-4 shrink-0 ${iconColor} ${active ? "drop-shadow-sm" : ""}` }),
      /* @__PURE__ */ jsx("span", { className: "truncate text-[13px]", children: c.name })
    ] }) }) }),
    canManage && /* @__PURE__ */ jsxs("div", { className: "absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all", children: [
      /* @__PURE__ */ jsx("button", { onClick: () => {
        setEditName(c.name);
        setEditTopic(c.topic ?? "");
        setEditDesc(c.description ?? "");
        setEditMinLevel(c.min_level ?? 1);
        setEditOpen(true);
      }, className: "p-1 text-muted-foreground/40 hover:text-foreground transition-colors", title: "Editar canal", children: /* @__PURE__ */ jsx(Pencil, { className: "h-3 w-3" }) }),
      /* @__PURE__ */ jsx("button", { onClick: () => deleteChannel(c.id), className: "p-1 text-muted-foreground/40 hover:text-destructive transition-colors", title: "Deletar canal", children: /* @__PURE__ */ jsx(X, { className: "h-3 w-3" }) })
    ] }),
    /* @__PURE__ */ jsx(ResponsiveDialog, { open: editOpen, onOpenChange: setEditOpen, title: "Editar canal", className: "max-w-md", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Nome" }),
        /* @__PURE__ */ jsx(Input, { value: editName, onChange: (e) => setEditName(e.target.value), className: "h-10", maxLength: 32 })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Tópico" }),
        /* @__PURE__ */ jsx(Input, { value: editTopic, onChange: (e) => setEditTopic(e.target.value), className: "h-10", maxLength: 128, placeholder: "Assunto do canal..." })
      ] }),
      c.type === "rules" && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Regras" }),
        /* @__PURE__ */ jsx("textarea", { value: editDesc, onChange: (e) => setEditDesc(e.target.value), className: "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none min-h-[100px]", maxLength: 2e3, placeholder: "Escreva as regras do servidor..." })
      ] }),
      c.type === "text" && /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Descrição" }),
        /* @__PURE__ */ jsx(Input, { value: editDesc, onChange: (e) => setEditDesc(e.target.value), className: "h-10", maxLength: 300, placeholder: "Descrição do canal..." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsxs(Label, { children: [
          "Nível mínimo: ",
          editMinLevel
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("input", { type: "range", min: 1, max: 99, value: editMinLevel, onChange: (e) => setEditMinLevel(Number(e.target.value)), className: "flex-1 accent-primary" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm font-mono text-muted-foreground w-8 text-center", children: editMinLevel })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { onClick: saveChannel, className: "w-full h-10", children: "Salvar" })
    ] }) })
  ] });
}
function ServerToolbar({
  canManage,
  isOwner,
  serverId,
  server,
  leave,
  settingsOpen,
  setSettingsOpen,
  toolsOpen,
  setToolsOpen
}) {
  return /* @__PURE__ */ jsxs("div", { className: "border-t border-sidebar-border bg-sidebar/80 shrink-0", children: [
    toolsOpen && /* @__PURE__ */ jsxs("div", { className: "p-2 flex flex-wrap gap-1 border-b border-sidebar-border bg-sidebar/50", children: [
      /* @__PURE__ */ jsx(ServerEventsDialog, { serverId, canManage }),
      /* @__PURE__ */ jsx(InvitesDialog, { serverId, canManage }),
      /* @__PURE__ */ jsx(ModeracaoDialog, { serverId, canManage })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center px-1.5 py-1.5", children: [
      /* @__PURE__ */ jsxs("button", { onClick: () => setSettingsOpen(true), className: "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50 transition-colors", title: "Configurações", children: [
        /* @__PURE__ */ jsx(Settings, { className: "h-3.5 w-3.5" }),
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "Ajustes" })
      ] }),
      (canManage || isOwner) && /* @__PURE__ */ jsxs("button", { onClick: () => setToolsOpen(!toolsOpen), className: "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-muted-foreground/60 hover:text-foreground hover:bg-sidebar-accent/50 transition-colors", title: "Ferramentas", children: [
        /* @__PURE__ */ jsx(Shield, { className: "h-3.5 w-3.5" }),
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "Ferram." })
      ] }),
      /* @__PURE__ */ jsxs("button", { onClick: leave, className: "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors", title: "Sair do servidor", children: [
        /* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
        /* @__PURE__ */ jsx("span", { className: "hidden sm:inline", children: "Sair" })
      ] })
    ] })
  ] });
}
function SlugEdit({
  slug,
  serverId,
  onSaved
}) {
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [val, setVal] = useState(slug);
  const [saving, setSaving] = useState(false);
  async function copy() {
    const url = `${window.location.origin}/app/s/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não consegui copiar");
    }
  }
  async function save() {
    const s = slugify(val);
    if (!isValidSlug(s)) return toast.error("Slug inválido (2-32 chars, a-z, 0-9, -).");
    setSaving(true);
    const {
      error
    } = await supabase.from("servers").update({
      slug: s
    }).eq("id", serverId);
    setSaving(false);
    if (error) {
      if (error.code === "23505" || /slug_taken/.test(error.message)) return toast.error("Esse slug já está em uso.");
      return toast.error(error.message);
    }
    toast.success("Slug atualizado!");
    setEditOpen(false);
    onSaved();
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-0.5", children: [
    /* @__PURE__ */ jsx("button", { onClick: copy, className: "p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground/40 hover:text-foreground transition-colors", title: "Copiar link do servidor", children: copied ? /* @__PURE__ */ jsx(Check, { className: "h-3 w-3 text-primary" }) : /* @__PURE__ */ jsx(Copy, { className: "h-3 w-3" }) }),
    /* @__PURE__ */ jsx("button", { onClick: () => {
      setEditOpen(true);
      setVal(slug);
    }, className: "p-1 rounded hover:bg-sidebar-accent/60 text-muted-foreground/40 hover:text-foreground transition-colors", title: "Editar slug", children: /* @__PURE__ */ jsx(Edit3, { className: "h-3 w-3" }) }),
    /* @__PURE__ */ jsx(ResponsiveDialog, { open: editOpen, onOpenChange: setEditOpen, title: "Editar slug", children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { children: "Slug" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(AtSign, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsx(Input, { className: "pl-8 font-mono h-10", value: val, onChange: (e) => setVal(slugify(e.target.value)), maxLength: 32 })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
          "panela.app/s/",
          slugify(val) || "—"
        ] })
      ] }),
      /* @__PURE__ */ jsx(Button, { className: "w-full h-10", onClick: save, disabled: saving || slugify(val) === slug, children: saving ? "Salvando…" : "Salvar" })
    ] }) })
  ] });
}
function ServerSettingsPanel({
  server,
  serverId,
  isOwner,
  canManage,
  canKick,
  kickMember,
  presence,
  onServerUpdate
}) {
  const [tab, setTab] = useState("overview");
  const {
    data: members = []
  } = useServerMembers(serverId);
  return /* @__PURE__ */ jsxs(Tabs, { value: tab, onValueChange: setTab, className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "p-4 md:p-5 pb-0", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 mb-3", children: [
        /* @__PURE__ */ jsx("div", { className: "relative shrink-0", children: server.icon_url ? /* @__PURE__ */ jsx("img", { src: server.icon_url, className: "h-9 w-9 rounded-xl object-cover ring-2 ring-border", alt: "" }) : /* @__PURE__ */ jsx("div", { className: "h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-2 ring-border grid place-items-center font-bold text-primary text-sm", children: server.name[0]?.toUpperCase() }) }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("h3", { className: "font-semibold text-sm truncate leading-tight", children: server.name }),
          /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60", children: [
            server.member_count,
            " ",
            server.member_count === 1 ? "membro" : "membros",
            " · ",
            server.privacy === "private" ? "Privado" : "Público"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(TabsList, { className: "w-full h-8", children: [
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "overview", className: "text-xs gap-1", children: [
          /* @__PURE__ */ jsx(Settings, { className: "h-3 w-3" }),
          "Geral"
        ] }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "members", className: "text-xs gap-1", children: [
          /* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }),
          "Membros"
        ] }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "channels", className: "text-xs gap-1", children: [
          /* @__PURE__ */ jsx(Hash, { className: "h-3 w-3" }),
          "Canais"
        ] }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "roles", className: "text-xs gap-1", children: [
          /* @__PURE__ */ jsx(Shield, { className: "h-3 w-3" }),
          "Cargos"
        ] }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "rewards", className: "text-xs gap-1", children: [
          /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3" }),
          "Recompensas"
        ] }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "stickers", className: "text-xs gap-1", children: [
          /* @__PURE__ */ jsx(Sticker, { className: "h-3 w-3" }),
          "Figurinhas"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-auto p-4 md:p-5", children: [
      /* @__PURE__ */ jsx(TabsContent, { value: "overview", className: "mt-0", children: /* @__PURE__ */ jsx(ServerOverviewTab, { server, serverId, isOwner, canManage, onServerUpdate }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "members", className: "mt-0", children: /* @__PURE__ */ jsx(ServerMembersTab, { server, serverId, canManage, canKick, members, kickMember, presence, isOwner }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "channels", className: "mt-0", children: /* @__PURE__ */ jsx(ServerChannelsTab, { serverId, canManage }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "roles", className: "mt-0 space-y-3", children: /* @__PURE__ */ jsx(ServerRoles, { serverId, canManage }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "rewards", className: "mt-0 space-y-3", children: /* @__PURE__ */ jsx(ServerRewardsTab, { serverId, canManage }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "stickers", className: "mt-0 space-y-3", children: /* @__PURE__ */ jsx(ServerStickers, { serverId, canManage }) })
    ] })
  ] });
}
function MobileChannelLink({
  c,
  serverId,
  currentId
}) {
  const active = currentId === c.id;
  const {
    icon: Icon,
    color: iconColor
  } = channelMeta(c.type);
  return /* @__PURE__ */ jsxs(Link, { to: "/app/servers/$serverId/$channelId", params: {
    serverId,
    channelId: c.id
  }, className: `flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-all ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground/80 hover:bg-sidebar-accent/50 hover:text-foreground"}`, children: [
    /* @__PURE__ */ jsx(Icon, { className: `h-4 w-4 shrink-0 ${iconColor}` }),
    /* @__PURE__ */ jsx("span", { className: "truncate", children: c.name })
  ] });
}
export {
  ServerLayout as component,
  useServerContext
};
