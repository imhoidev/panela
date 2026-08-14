import { jsxs, jsx } from "react/jsx-runtime";
import { useLocation, Link, Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { u as useAuth, s as supabase } from "./router-mRNo7IUv.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { S as Sheet, e as SheetTrigger, a as SheetContent, c as SheetHeader, d as SheetTitle } from "./sheet-DQ5cLgT7.js";
import { I as Input } from "./input-D_U8fI25.js";
import { MessageSquare, Search, Loader2, Menu, ArrowLeft } from "lucide-react";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "@radix-ui/react-avatar";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-dialog";
function DMLayout() {
  const {
    user
  } = useAuth();
  const loc = useLocation();
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState(/* @__PURE__ */ new Map());
  const [myParts, setMyParts] = useState(/* @__PURE__ */ new Map());
  const [openSheet, setOpenSheet] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  async function loadDMs(showLoader = true) {
    if (!user) return;
    if (showLoader) setLoading(true);
    const {
      data: myParts2
    } = await supabase.from("dm_participants").select("conversation_id, last_read_at").eq("user_id", user.id);
    const convIds = (myParts2 ?? []).map((p) => p.conversation_id);
    if (!convIds.length) {
      setConversations([]);
      setMyParts(/* @__PURE__ */ new Map());
      setProfiles(/* @__PURE__ */ new Map());
      if (showLoader) setLoading(false);
      return;
    }
    const lastReadMap = /* @__PURE__ */ new Map();
    (myParts2 ?? []).forEach((p) => {
      if (p.last_read_at) lastReadMap.set(p.conversation_id, p.last_read_at);
    });
    setMyParts(lastReadMap);
    const {
      data: convs
    } = await supabase.from("dm_conversations").select("*").in("id", convIds).order("last_message_at", {
      ascending: false,
      nullsFirst: false
    });
    const {
      data: allParts
    } = await supabase.rpc("get_dm_participants", {
      conv_ids: convIds
    });
    const partsByConv = /* @__PURE__ */ new Map();
    (allParts ?? []).forEach((p) => {
      const arr = partsByConv.get(p.conversation_id) ?? [];
      arr.push(p);
      partsByConv.set(p.conversation_id, arr);
    });
    const allIds = /* @__PURE__ */ new Set();
    const mapped = (convs ?? []).map((c) => {
      const participants = partsByConv.get(c.id) ?? [];
      participants.forEach((p) => allIds.add(p.user_id));
      const others = participants.filter((p) => p.user_id !== user.id);
      return {
        ...c,
        participants,
        others,
        isGroup: participants.length > 2,
        title: "Carregando...",
        preview: c.last_message_preview || "Nenhuma mensagem ainda"
      };
    });
    if (allIds.size) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id,username,display_name,avatar_url,status,status_text").in("id", [...allIds]);
      const m = new Map(profs?.map((p) => [p.id, p]) ?? []);
      setProfiles(m);
      setConversations(mapped.map((c) => {
        const names = (c.others ?? []).map((p) => m.get(p.user_id)?.display_name || m.get(p.user_id)?.username || "Usuário");
        const title = names.length === 0 ? "Conversação" : names.length === 1 ? names[0] : `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
        const otherProfile = c.others[0] ? {
          ...c.others[0],
          ...m.get(c.others[0]?.user_id) ?? {}
        } : null;
        return {
          ...c,
          title,
          preview: c.last_message_preview || "Nenhuma mensagem ainda",
          participantsProfiles: c.participants.map((p) => m.get(p.user_id) ?? null),
          other: otherProfile
        };
      }));
    } else {
      setConversations(mapped);
    }
    if (showLoader) setLoading(false);
  }
  useEffect(() => {
    loadDMs();
  }, [user?.id]);
  useEffect(() => {
    if (loc.pathname === "/app/dms") loadDMs(false);
  }, [loc.pathname]);
  async function fetchNewConversation(convId) {
    if (!user) return;
    const {
      data: conv
    } = await supabase.from("dm_conversations").select("*").eq("id", convId).single();
    if (!conv) return;
    const {
      data: parts
    } = await supabase.rpc("get_dm_participants_single", {
      conv_id: convId
    });
    const participants = parts ?? [];
    const otherParticipants = participants.filter((p) => p.user_id !== user.id);
    const ids = [...new Set(participants.map((p) => p.user_id))];
    if (ids.length) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id,username,display_name,avatar_url,status,status_text").in("id", ids);
      if (profs) profs.forEach((prof) => setProfiles((prev) => new Map(prev).set(prof.id, prof)));
    }
    const names = otherParticipants.map((p) => {
      const prof = profiles.get(p.user_id);
      return prof?.display_name || prof?.username || "Usuário";
    });
    const title = names.length === 0 ? "Conversação" : names.length === 1 ? names[0] : `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
    const otherProfile = otherParticipants[0] ? {
      ...otherParticipants[0],
      ...profiles.get(otherParticipants[0]?.user_id) ?? {}
    } : null;
    const newConv = {
      ...conv,
      participants,
      others: otherParticipants,
      isGroup: participants.length > 2,
      title,
      preview: conv.last_message_preview || "Nenhuma mensagem ainda",
      participantsProfiles: participants.map((p) => profiles.get(p.user_id) ?? null),
      other: otherProfile
    };
    setConversations((prev) => {
      if (prev.some((c) => c.id === convId)) return prev;
      return [...prev, newConv].sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    });
  }
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("dm-list").on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "dm_messages"
    }, (payload) => {
      const msg = payload.new;
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversation_id);
        if (exists) {
          const updated = prev.map((c) => c.id === msg.conversation_id ? {
            ...c,
            last_message_preview: msg.content?.slice(0, 120) || "📎 Arquivo",
            last_message_at: msg.created_at
          } : c);
          return updated.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
        }
        return prev;
      });
      fetchNewConversation(msg.conversation_id);
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);
  const inChat = loc.pathname.match(/^\/app\/dms\/[^/]+$/);
  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const title = String(c.title || "").toLowerCase();
    return title.includes(search.toLowerCase());
  });
  function timeAgo(date) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 6e4);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit"
    });
  }
  function hasUnread(c) {
    const readAt = myParts.get(c.id);
    return !!c.last_message_at && (!readAt || new Date(c.last_message_at) > new Date(readAt));
  }
  const sidebar = /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full bg-sidebar/90 backdrop-blur-md", children: [
    /* @__PURE__ */ jsx("div", { className: "p-4 border-b border-sidebar-border/60", children: /* @__PURE__ */ jsxs("h2", { className: "font-semibold text-sm flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4 text-primary/70" }),
      " Mensagens Diretas"
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "p-2", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" }),
      /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar conversas...", className: "pl-8 h-9 text-xs bg-sidebar-accent/30 border-sidebar-border/50 focus:bg-sidebar-accent/50 transition-colors backdrop-blur-sm" })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 overflow-auto p-2 space-y-0.5", children: [
      filtered.map((c) => {
        const active = loc.pathname === `/app/dms/${c.id}`;
        const unread = hasUnread(c);
        const title = c.title || "Carregando...";
        const subtitle = c.isGroup ? `${c.participants?.length ?? 0} membros` : "Privado";
        const avatars = (c.participantsProfiles ?? []).filter((p) => p?.id !== user?.id).slice(0, 3);
        return /* @__PURE__ */ jsxs(Link, { to: "/app/dms/$conversationId", params: {
          conversationId: c.id
        }, className: `flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "relative shrink-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "relative h-10 w-10", children: [
              /* @__PURE__ */ jsx("div", { className: "absolute inset-0 rounded-full bg-accent/80 ring-1 ring-border" }),
              /* @__PURE__ */ jsxs("div", { className: "flex", children: [
                avatars.map((profile, idx) => /* @__PURE__ */ jsxs(Avatar, { className: `h-8 w-8 ring-2 ring-card ${idx > 0 ? "-ml-2" : ""}`, children: [
                  /* @__PURE__ */ jsx(AvatarImage, { src: profile?.avatar_url ?? void 0 }),
                  /* @__PURE__ */ jsx(AvatarFallback, { children: profile?.username?.[0]?.toUpperCase() ?? "?" })
                ] }, profile?.id ?? idx)),
                !avatars.length && /* @__PURE__ */ jsx(Avatar, { className: "h-9 w-9", children: /* @__PURE__ */ jsx(AvatarFallback, { children: "?" }) })
              ] })
            ] }),
            !c.isGroup && c.other && /* @__PURE__ */ jsx("span", { className: `absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar ${c.other?.status === "online" ? "bg-emerald-500" : c.other?.status === "idle" ? "bg-yellow-500" : c.other?.status === "dnd" ? "bg-red-500" : "bg-muted-foreground/30"}` }),
            unread && /* @__PURE__ */ jsx("span", { className: "absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-sidebar" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsx("p", { className: `truncate ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`, children: title }),
              c.last_message_at && /* @__PURE__ */ jsx("span", { className: `text-[10px] shrink-0 ${unread ? "text-primary font-medium" : "text-muted-foreground/50"}`, children: timeAgo(c.last_message_at) })
            ] }),
            /* @__PURE__ */ jsx("p", { className: `truncate text-xs ${unread ? "text-foreground/80 font-medium" : "opacity-60"}`, children: c.preview }),
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground/60 mt-1", children: subtitle })
          ] })
        ] }, c.id);
      }),
      loading ? /* @__PURE__ */ jsx("div", { className: "flex justify-center py-8", children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-muted-foreground/40" }) }) : filtered.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-12 px-4", children: [
        /* @__PURE__ */ jsx("div", { className: "h-12 w-12 rounded-2xl bg-muted/30 grid place-items-center mx-auto mb-3", children: /* @__PURE__ */ jsx(MessageSquare, { className: "h-5 w-5 text-muted-foreground/40" }) }),
        /* @__PURE__ */ jsx("p", { className: "text-xs font-medium text-muted-foreground/70", children: search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda" }),
        /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground/40 mt-1", children: search ? "Tente outro termo de busca" : "Inicie uma conversa pelo perfil de um usuário" })
      ] }) : null
    ] })
  ] });
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0", children: [
    /* @__PURE__ */ jsx("aside", { className: "hidden md:flex w-72 flex-col border-r border-border bg-sidebar shrink-0", children: sidebar }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 min-h-0 flex flex-col", children: [
      /* @__PURE__ */ jsxs("div", { className: "md:hidden flex items-center gap-2 px-2 h-11 border-b border-border bg-sidebar/80 shrink-0", children: [
        /* @__PURE__ */ jsxs(Sheet, { open: openSheet, onOpenChange: setOpenSheet, children: [
          /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "ghost", className: "h-8 gap-1.5", children: [
            /* @__PURE__ */ jsx(Menu, { className: "h-4 w-4" }),
            "DMs"
          ] }) }),
          /* @__PURE__ */ jsxs(SheetContent, { side: "left", className: "p-0 w-[300px] bg-sidebar", children: [
            /* @__PURE__ */ jsx(SheetHeader, { className: "sr-only", children: /* @__PURE__ */ jsx(SheetTitle, { children: "Mensagens" }) }),
            sidebar
          ] })
        ] }),
        inChat && /* @__PURE__ */ jsxs(Link, { to: "/app/dms", className: "text-xs text-muted-foreground flex items-center gap-1", children: [
          /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }),
          " Voltar"
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0 min-h-0 flex", children: /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0 min-h-0", children: /* @__PURE__ */ jsx(Outlet, {}) }) })
    ] })
  ] });
}
export {
  DMLayout as component
};
