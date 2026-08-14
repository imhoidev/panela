import { jsxs, jsx } from "react/jsx-runtime";
import { useParams, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { u as useAuth, s as supabase } from "./router-mRNo7IUv.js";
import { T as Textarea } from "./textarea-F69quoCd.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { U as UsernameBadge } from "./UsernameBadge-BFbH-T_u.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { u as useRealtimeSocket } from "./useRealtime-Cqf46s7E.js";
import { M as MediaAttachment } from "./MediaLightbox-DK316uU7.js";
import { Loader2, Bell, RefreshCcw, Slash, ShieldOff, CornerUpLeft, Paperclip, Trash2, ArrowDown, X, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "@radix-ui/react-avatar";
import "./badge-YM7oB01y.js";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "socket.io-client";
import "./dialog-BzLIvjno.js";
import "@radix-ui/react-dialog";
function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 5e3) return "agora";
  if (diff < 6e4) return `${Math.floor(diff / 1e3)}s`;
  if (diff < 36e5) return `${Math.floor(diff / 6e4)}m`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)}h`;
  if (diff < 1728e5) return "ontem";
  if (diff < 6048e5) return `${Math.floor(diff / 864e5)}d`;
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}
function getDateLabel(date) {
  const d = new Date(date);
  const now = /* @__PURE__ */ new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  if (d >= weekAgo) return d.toLocaleDateString("pt-BR", {
    weekday: "long"
  });
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}
function DMChat() {
  const {
    conversationId
  } = useParams({
    from: "/app/dms/$conversationId"
  });
  const {
    user,
    session
  } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationParticipants, setConversationParticipants] = useState([]);
  const [groupTitle, setGroupTitle] = useState("Chat privado");
  const [otherProfile, setOtherProfile] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherStatus, setOtherStatus] = useState("offline");
  const [sendMode, setSendMode] = useState("enter");
  const [mobileExperience, setMobileExperience] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const fileRef = useRef(null);
  const profilesCache = useRef(/* @__PURE__ */ new Map());
  const prevScrollHeight = useRef(0);
  const {
    socket
  } = useRealtimeSocket();
  const lastTypingSent = useRef(0);
  const inputRef = useRef(null);
  const knownIds = useRef(/* @__PURE__ */ new Set());
  const scrollTimeout = useRef(null);
  const STATUS_DOT = {
    online: "bg-emerald-500",
    idle: "bg-yellow-500",
    dnd: "bg-red-500",
    invisible: "bg-muted-foreground/30",
    offline: "bg-muted-foreground/30"
  };
  const STATUS_LABEL = {
    online: "Online",
    idle: "Ausente",
    dnd: "Ocupado",
    invisible: "Invisível",
    offline: "Offline"
  };
  async function load() {
    setLoading(true);
    const authors = [];
    const {
      data: parts
    } = await supabase.rpc("get_dm_participants_single", {
      conv_id: conversationId
    });
    const participants = parts ?? [];
    setConversationParticipants(participants);
    const pIds = participants.map((p) => p.user_id);
    authors.push(...pIds);
    const otherParticipants = participants.filter((p) => p.user_id !== user?.id);
    const otherId = otherParticipants[0]?.user_id;
    if (otherParticipants.length === 1) {
      const {
        data: prof
      } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", otherId).maybeSingle();
      if (prof) {
        profilesCache.current.set(prof.id, prof);
        setOtherProfile(prof);
      }
      setGroupTitle(prof?.display_name || prof?.username || "Chat privado");
    } else if (otherParticipants.length > 1) {
      const participantNames = otherParticipants.slice(0, 3).map((p) => profilesCache.current.get(p.user_id)?.display_name || profilesCache.current.get(p.user_id)?.username || "Usuário");
      setGroupTitle(`${participantNames.join(", ")} ${otherParticipants.length > 3 ? `+${otherParticipants.length - 3}` : ""}`.trim());
    } else {
      setGroupTitle("Chat privado");
    }
    const {
      data: msgs
    } = await supabase.from("dm_messages").select("*").eq("conversation_id", conversationId).order("created_at", {
      ascending: true
    }).limit(100);
    const list = msgs ?? [];
    list.forEach((m) => knownIds.current.add(m.id));
    authors.push(...list.map((m) => m.author_id));
    if (authors.length) {
      const {
        data: profs
      } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", [...new Set(authors)]);
      (profs ?? []).forEach((p) => profilesCache.current.set(p.id, p));
      if (otherParticipants.length > 1) {
        const participantNames = otherParticipants.slice(0, 3).map((p) => profilesCache.current.get(p.user_id)?.display_name || profilesCache.current.get(p.user_id)?.username || "Usuário");
        setGroupTitle(`${participantNames.join(", ")} ${otherParticipants.length > 3 ? `+${otherParticipants.length - 3}` : ""}`.trim());
      }
    }
    setMessages(list);
    setHasMore(list.length >= 100);
    setLoading(false);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight
    }));
    if (user) {
      await supabase.from("dm_participants").update({
        last_read_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("conversation_id", conversationId).eq("user_id", user.id);
    }
  }
  useEffect(() => {
    setMessages([]);
    setOtherProfile(null);
    setLoading(true);
    setHasMore(true);
    setReplyTo(null);
    knownIds.current.clear();
    load();
  }, [conversationId]);
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSendMode(localStorage.getItem("panela:dmSendMode") || "enter");
    setMobileExperience(localStorage.getItem("panela:dmMobileGestures") === "true");
    setCompactMode(localStorage.getItem("panela:dmCompactChats") === "true");
  }, [conversationId]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("panela:dmSendMode", sendMode);
  }, [sendMode]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("panela:dmMobileGestures", String(mobileExperience));
    localStorage.setItem("panela:dmCompactChats", String(compactMode));
  }, [mobileExperience, compactMode]);
  useEffect(() => {
    if (!hasMore || loadingMore || !sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMore || !hasMore) return;
      setLoadingMore(true);
      const oldest = messages[0];
      if (!oldest) {
        setLoadingMore(false);
        return;
      }
      prevScrollHeight.current = scrollRef.current?.scrollHeight || 0;
      supabase.from("dm_messages").select("*").eq("conversation_id", conversationId).lt("created_at", oldest.created_at).order("created_at", {
        ascending: false
      }).limit(50).then(async ({
        data
      }) => {
        const older = (data ?? []).reverse();
        if (older.length < 50) setHasMore(false);
        if (!older.length) {
          setLoadingMore(false);
          return;
        }
        older.forEach((m) => knownIds.current.add(m.id));
        const authors = [...new Set(older.map((m) => m.author_id))];
        const {
          data: profs
        } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", authors);
        (profs ?? []).forEach((p) => profilesCache.current.set(p.id, p));
        setMessages((prev) => [...older, ...prev]);
        setLoadingMore(false);
        requestAnimationFrame(() => {
          if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight.current;
        });
      });
    }, {
      rootMargin: "200px"
    });
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, messages.length, conversationId]);
  useEffect(() => {
    const ch = supabase.channel(`dm-${conversationId}`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "dm_messages",
      filter: `conversation_id=eq.${conversationId}`
    }, async (payload) => {
      const m = payload.new;
      if (knownIds.current.has(m.id) || m.author_id === user?.id) return;
      knownIds.current.add(m.id);
      if (!profilesCache.current.has(m.author_id)) {
        const {
          data
        } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", m.author_id).maybeSingle();
        if (data) profilesCache.current.set(m.author_id, data);
      }
      setMessages((prev) => [...prev, m]);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const atBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 150;
          if (atBottom) scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
      });
    }).on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "dm_messages",
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => setMessages((prev) => prev.map((x) => x.id === payload.new.id ? {
      ...x,
      ...payload.new
    } : x))).on("postgres_changes", {
      event: "DELETE",
      schema: "public",
      table: "dm_messages",
      filter: `conversation_id=eq.${conversationId}`
    }, (payload) => {
      const id = payload.old.id;
      knownIds.current.delete(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, user?.id]);
  useEffect(() => {
    if (!user || !socket) return;
    const otherId = otherProfile?.id;
    const onConnect = () => {
      socket.emit("presence:join", {
        serverId: "__dm__",
        status: "online"
      });
      if (conversationId) socket.emit("dm:join", conversationId);
      if (otherId) socket.emit("presence:subscribe", [otherId, user.id]);
    };
    const onUsers = (users) => {
      if (otherId) {
        const found = users.find((u) => u.userId === otherId);
        if (found) setOtherStatus(found.status);
      }
    };
    const onPresenceUpdate = ({
      userId: uid,
      status
    }) => {
      if (uid === otherId) setOtherStatus(status);
    };
    const onTypingStart = ({
      userId: uid
    }) => {
      if (uid === user.id || uid !== otherId) return;
      setOtherTyping(true);
    };
    const onTypingStop = ({
      userId: uid
    }) => {
      if (uid === otherId) setOtherTyping(false);
    };
    const onMessageNew = async (m) => {
      if (knownIds.current.has(m.id) || m.author_id === user.id) return;
      knownIds.current.add(m.id);
      if (!profilesCache.current.has(m.author_id)) {
        const {
          data
        } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", m.author_id).maybeSingle();
        if (data) profilesCache.current.set(m.author_id, data);
      }
      setMessages((prev) => [...prev, m]);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const atBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 150;
          if (atBottom) scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
      });
    };
    const onMessageDeleted = ({
      messageId
    }) => {
      knownIds.current.delete(messageId);
      setMessages((prev) => prev.filter((x) => x.id !== messageId));
    };
    const onMessageUpdated = (m) => {
      setMessages((prev) => prev.map((x) => x.id === m.id ? {
        ...x,
        ...m
      } : x));
    };
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("presence:users", onUsers);
    socket.on("presence:update", onPresenceUpdate);
    const typingTimeout = setInterval(() => {
      setOtherTyping(false);
    }, 4e3);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:new", onMessageNew);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:updated", onMessageUpdated);
    return () => {
      clearInterval(typingTimeout);
      socket.off("connect", onConnect);
      socket.off("presence:users", onUsers);
      socket.off("presence:update", onPresenceUpdate);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:new", onMessageNew);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:updated", onMessageUpdated);
      if (conversationId) socket.emit("dm:leave", conversationId);
    };
  }, [user?.id, conversationId, otherProfile?.id, socket]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      setShowScrollBtn(!atBottom && messages.length > 0);
      scrollTimeout.current = setTimeout(() => {
      }, 100);
    };
    el.addEventListener("scroll", onScroll, {
      passive: true
    });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);
  function scrollToBottom(smooth = true) {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? "smooth" : "instant"
    });
    setShowScrollBtn(false);
  }
  function emitTyping() {
    if (!socket) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    socket.emit("dm:typing:start", {
      conversationId,
      username: user?.email || "Você"
    });
  }
  async function send(e) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    const content = text.trim();
    const reply = replyTo?.id ?? null;
    setText("");
    setReplyTo(null);
    setSending(true);
    const {
      data,
      error
    } = await supabase.from("dm_messages").insert({
      conversation_id: conversationId,
      author_id: user.id,
      content,
      reply_to: reply
    }).select().maybeSingle();
    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }
    if (data) {
      const m = data;
      knownIds.current.add(m.id);
      setMessages((prev) => [...prev, m]);
      if (socket) socket.emit("message:new", {
        conversationId,
        message: m
      });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      }));
    }
    setSending(false);
  }
  async function removeMsg(m) {
    if (!confirm("Apagar?")) return;
    knownIds.current.delete(m.id);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    if (socket) socket.emit("message:deleted", {
      conversationId,
      messageId: m.id
    });
    await supabase.from("dm_messages").delete().eq("id", m.id);
  }
  function authorProfile(authorId) {
    return profilesCache.current.get(authorId) ?? null;
  }
  function getRepliedMsg(m) {
    return m.reply_to ? messages.find((x) => x.id === m.reply_to) : void 0;
  }
  const other = otherProfile;
  const statusDot = STATUS_DOT[otherStatus] || STATUS_DOT.offline;
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
      /* @__PURE__ */ jsxs("header", { className: "h-12 border-b border-border px-4 flex items-center gap-2.5 bg-card/30 shrink-0", children: [
        /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-full bg-muted animate-pulse" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("div", { className: "h-3 w-24 bg-muted rounded animate-pulse" }),
          /* @__PURE__ */ jsx("div", { className: "h-2 w-16 bg-muted rounded animate-pulse" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex-1 flex items-center justify-center", children: /* @__PURE__ */ jsx(Loader2, { className: "h-6 w-6 animate-spin text-muted-foreground/50" }) })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full relative", children: [
    /* @__PURE__ */ jsxs("header", { className: "pb-3 border-b border-border/50 bg-card/40 backdrop-blur-md sticky top-0 z-10 shadow-sm", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 px-4 pt-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative shrink-0", children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-center", children: conversationParticipants.filter((p) => p.user_id !== user?.id).slice(0, 3).map((participant, idx) => {
            const profile = profilesCache.current.get(participant.user_id) ?? null;
            return /* @__PURE__ */ jsxs(Avatar, { className: `h-9 w-9 ring-2 ring-card ${idx > 0 ? "-ml-3" : ""}`, children: [
              /* @__PURE__ */ jsx(AvatarImage, { src: profile?.avatar_url ?? void 0 }),
              /* @__PURE__ */ jsx(AvatarFallback, { children: profile?.username?.[0]?.toUpperCase() ?? "?" })
            ] }, participant.user_id);
          }) }),
          /* @__PURE__ */ jsx("span", { className: `absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${statusDot}` })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold truncate", children: conversationParticipants.length > 2 ? groupTitle : other?.display_name || other?.username || "Carregando..." }),
          /* @__PURE__ */ jsxs("div", { className: "text-[10px] text-muted-foreground flex flex-wrap gap-2", children: [
            /* @__PURE__ */ jsxs("span", { className: `inline-flex items-center gap-1.5`, children: [
              /* @__PURE__ */ jsx("span", { className: `h-2 w-2 rounded-full ${statusDot}` }),
              conversationParticipants.length > 2 ? `${conversationParticipants.length} participantes` : STATUS_LABEL[otherStatus] || "Offline"
            ] }),
            /* @__PURE__ */ jsx("span", { className: "inline-flex items-center gap-1 text-muted-foreground/70", children: conversationParticipants.length > 2 ? "Grupo" : "Mensagem direta" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-3 px-4 flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2", onClick: () => setIsMuted((current) => !current), children: [
          /* @__PURE__ */ jsx(Bell, { className: "h-4 w-4" }),
          " ",
          isMuted ? "Desativar som" : "Silenciar"
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2", onClick: () => load(), children: [
          /* @__PURE__ */ jsx(RefreshCcw, { className: "h-4 w-4" }),
          " Atualizar"
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2", onClick: () => setMobileExperience((prev) => !prev), children: [
          /* @__PURE__ */ jsx(Slash, { className: "h-4 w-4" }),
          " ",
          mobileExperience ? "Modo móvel" : "Experiência touch"
        ] }),
        /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "gap-2", onClick: () => setCompactMode((prev) => !prev), children: [
          /* @__PURE__ */ jsx(ShieldOff, { className: "h-4 w-4" }),
          " ",
          compactMode ? "Compacto" : "Expandir"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: scrollRef, className: "flex-1 overflow-auto px-3 py-3 space-y-1 scroll-smooth bg-gradient-to-b from-transparent via-background/50 to-background/30", children: [
      hasMore && /* @__PURE__ */ jsx("div", { ref: sentinelRef, className: "h-3" }),
      loadingMore && /* @__PURE__ */ jsx("div", { className: "flex justify-center py-2", children: /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin text-muted-foreground/40" }) }),
      messages.length === 0 && !loadingMore && /* @__PURE__ */ jsxs("div", { className: "text-center text-muted-foreground py-12", children: [
        /* @__PURE__ */ jsx("div", { className: "h-14 w-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-3", children: /* @__PURE__ */ jsxs(Avatar, { className: "h-10 w-10", children: [
          /* @__PURE__ */ jsx(AvatarImage, { src: other?.avatar_url ?? void 0 }),
          /* @__PURE__ */ jsx(AvatarFallback, { children: other?.username?.[0]?.toUpperCase() ?? "?" })
        ] }) }),
        /* @__PURE__ */ jsx("p", { className: "font-medium", children: "Início da conversa" }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm", children: [
          "Mande uma mensagem para ",
          other?.display_name || other?.username || "seu contato",
          "!"
        ] })
      ] }),
      messages.map((m, i) => {
        const prev = messages[i - 1];
        const showDateSep = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
        const isMine = m.author_id === user?.id;
        const profile = authorProfile(m.author_id);
        const replied = getRepliedMsg(m);
        const repliedProfile = replied ? authorProfile(replied.author_id) : null;
        const sameAuthor = prev && prev.author_id === m.author_id && !m.reply_to && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 3e5;
        return /* @__PURE__ */ jsxs("div", { children: [
          showDateSep && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 my-4", children: [
            /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border/40" }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider shrink-0", children: getDateLabel(m.created_at) }),
            /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border/40" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: `group flex gap-2.5 ${isMine ? "flex-row-reverse" : ""} ${sameAuthor ? "mt-0.5" : "mt-2"}`, children: [
            !sameAuthor ? /* @__PURE__ */ jsx(Link, { to: "/app/u/$slug", params: {
              slug: m.author_id
            }, className: "shrink-0", children: /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 mt-0.5", children: [
              /* @__PURE__ */ jsx(AvatarImage, { src: profile?.avatar_url ?? void 0 }),
              /* @__PURE__ */ jsx(AvatarFallback, { className: "text-xs", children: profile?.username?.[0]?.toUpperCase() ?? "?" })
            ] }) }) : /* @__PURE__ */ jsx("div", { className: "w-8 shrink-0" }),
            /* @__PURE__ */ jsxs("div", { className: `min-w-0 flex flex-col ${compactMode ? "max-w-[85%]" : "max-w-[75%]"} ${isMine ? "items-end" : ""}`, children: [
              !isMine && !sameAuthor && profile && /* @__PURE__ */ jsx(Link, { to: "/app/u/$slug", params: {
                slug: m.author_id
              }, className: "text-xs font-medium mb-0.5 ml-1 hover:underline", children: /* @__PURE__ */ jsx(UsernameBadge, { profile }) }),
              replied && /* @__PURE__ */ jsxs("div", { className: `text-[11px] flex items-center gap-1.5 mb-0.5 px-3 py-1 rounded-lg max-w-[280px] truncate ${isMine ? "bg-primary/20" : "bg-accent/60"}`, children: [
                /* @__PURE__ */ jsx(CornerUpLeft, { className: "h-3 w-3 shrink-0 text-muted-foreground/60" }),
                /* @__PURE__ */ jsxs(Avatar, { className: "h-4 w-4", children: [
                  /* @__PURE__ */ jsx(AvatarImage, { src: repliedProfile?.avatar_url }),
                  /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[7px]", children: repliedProfile?.username?.[0]?.toUpperCase() })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "truncate text-muted-foreground/80", children: replied.content })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: `rounded-2xl text-sm ${compactMode ? "px-3 py-2" : "px-3.5 py-2.5"} ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-accent rounded-bl-md"}`, children: [
                m.content && /* @__PURE__ */ jsx("div", { className: "prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-a:text-inherit prose-img:rounded-lg", children: /* @__PURE__ */ jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: m.content }) }),
                m.edited_at && /* @__PURE__ */ jsx("span", { className: "text-[10px] opacity-60", children: "(editado)" }),
                m.attachment_url && /* @__PURE__ */ jsx("div", { className: "mt-1.5", children: /* @__PURE__ */ jsx(MediaAttachment, { url: m.attachment_url, type: m.attachment_type, children: m.attachment_type?.startsWith("image/") ? /* @__PURE__ */ jsx("img", { src: m.attachment_url, alt: "attachment", className: "max-h-48 rounded-lg object-contain cursor-pointer" }) : m.attachment_type?.startsWith("video/") ? /* @__PURE__ */ jsxs("div", { className: "relative cursor-pointer", children: [
                  /* @__PURE__ */ jsx("video", { src: m.attachment_url, className: "max-h-48 rounded-lg object-contain" }),
                  /* @__PURE__ */ jsx("div", { className: "absolute inset-0 grid place-items-center", children: /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-full bg-black/50 grid place-items-center", children: /* @__PURE__ */ jsx("span", { className: "text-white text-xl ml-0.5", children: "▶" }) }) })
                ] }) : /* @__PURE__ */ jsxs("div", { className: "inline-flex items-center gap-1.5 text-xs underline opacity-80 hover:opacity-100 cursor-pointer", children: [
                  /* @__PURE__ */ jsx(Paperclip, { className: "h-3 w-3" }),
                  m.attachment_url.split("/").pop()
                ] }) }) })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mt-0.5 px-1", children: [
                /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground", title: new Date(m.created_at).toLocaleString("pt-BR"), children: relativeTime(m.created_at) }),
                isMine && /* @__PURE__ */ jsx("button", { onClick: () => removeMsg(m), className: "opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/50 hover:text-destructive transition-all", children: /* @__PURE__ */ jsx(Trash2, { className: "h-3 w-3" }) })
              ] })
            ] }),
            !isMine && /* @__PURE__ */ jsx("button", { onClick: () => setReplyTo(m), className: "opacity-0 group-hover:opacity-100 self-center p-1 text-muted-foreground/40 hover:text-foreground transition-opacity shrink-0", children: /* @__PURE__ */ jsx(CornerUpLeft, { className: "h-3.5 w-3.5" }) })
          ] })
        ] }, m.id);
      }),
      otherTyping && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 px-1 py-1.5", children: [
        /* @__PURE__ */ jsx("div", { className: "w-8 shrink-0" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground/60", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex gap-0.5", children: [
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce", style: {
              animationDelay: "0ms"
            } }),
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce", style: {
              animationDelay: "200ms"
            } }),
            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce", style: {
              animationDelay: "400ms"
            } })
          ] }),
          other?.display_name || other?.username || "Alguém",
          " está digitando…"
        ] })
      ] })
    ] }),
    mobileExperience && /* @__PURE__ */ jsx("div", { className: "md:hidden sticky bottom-0 left-0 right-0 z-20 border-t border-border bg-background/90 backdrop-blur-sm px-3 py-3", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-3 gap-2", children: [
      /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => fileRef.current?.click(), className: "rounded-2xl border border-border bg-accent/70 py-3 text-[12px] font-medium text-foreground hover:bg-accent transition", children: [
        /* @__PURE__ */ jsx(Paperclip, { className: "mx-auto mb-1 h-4 w-4" }),
        " Anexar"
      ] }),
      /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => setReplyTo(messages[messages.length - 1] ?? null), className: "rounded-2xl border border-border bg-accent/70 py-3 text-[12px] font-medium text-foreground hover:bg-accent transition", children: [
        /* @__PURE__ */ jsx(CornerUpLeft, { className: "mx-auto mb-1 h-4 w-4" }),
        " Responder"
      ] }),
      /* @__PURE__ */ jsxs("button", { type: "button", onClick: () => scrollToBottom(), className: "rounded-2xl border border-border bg-primary text-primary-foreground py-3 text-[12px] font-medium hover:bg-primary/90 transition", children: [
        /* @__PURE__ */ jsx(ArrowDown, { className: "mx-auto mb-1 h-4 w-4" }),
        " Baixar"
      ] })
    ] }) }),
    showScrollBtn && /* @__PURE__ */ jsx("button", { onClick: () => scrollToBottom(), className: "absolute bottom-20 right-6 h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 grid place-items-center hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2 z-10", children: /* @__PURE__ */ jsx(ArrowDown, { className: "h-5 w-5 text-primary-foreground" }) }),
    /* @__PURE__ */ jsxs("form", { onSubmit: send, className: "p-2 sm:p-3 border-t border-border/50 bg-card/40 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0", children: [
      replyTo && /* @__PURE__ */ jsxs("div", { className: "mb-1.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 backdrop-blur-sm border border-border/50 text-xs", children: [
        /* @__PURE__ */ jsx(CornerUpLeft, { className: "h-3 w-3 shrink-0 text-muted-foreground/60" }),
        /* @__PURE__ */ jsxs(Avatar, { className: "h-5 w-5", children: [
          /* @__PURE__ */ jsx(AvatarImage, { src: authorProfile(replyTo.author_id)?.avatar_url }),
          /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[8px]", children: (authorProfile(replyTo.author_id)?.username || "?")[0]?.toUpperCase() })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "truncate text-muted-foreground/70", children: replyTo.content }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setReplyTo(null), className: "ml-auto p-0.5 text-muted-foreground/50 hover:text-foreground shrink-0", children: /* @__PURE__ */ jsx(X, { className: "h-3.5 w-3.5" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 bg-background/90 backdrop-blur-xl rounded-xl border border-border/50 px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-sm focus-within:border-primary/40 transition-all", children: [
        /* @__PURE__ */ jsx("input", { type: "file", ref: fileRef, className: "hidden", onChange: (e) => {
          const f = e.target.files?.[0];
          if (f) uploadFile(f, conversationId);
          e.target.value = "";
        } }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => fileRef.current?.click(), className: "text-muted-foreground/50 hover:text-foreground p-1.5 shrink-0 transition-colors", children: /* @__PURE__ */ jsx(Paperclip, { className: "h-5 w-5" }) }),
        /* @__PURE__ */ jsx(Textarea, { ref: inputRef, value: text, onChange: (e) => {
          setText(e.target.value);
          emitTyping();
        }, onKeyDown: (e) => {
          if (e.key === "Enter" && !e.shiftKey && sendMode === "enter") {
            e.preventDefault();
            send(e);
          }
          if (e.key === "Enter" && e.ctrlKey && sendMode === "ctrlEnter") {
            e.preventDefault();
            send(e);
          }
        }, placeholder: "Mensagem...", rows: 2, className: `bg-transparent border-0 resize-none flex-1 min-w-0 px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm ${compactMode ? "py-2" : "py-3"}`, maxLength: 2e3 }),
        /* @__PURE__ */ jsx("button", { type: "submit", disabled: !text.trim() || sending, className: "text-primary/60 hover:text-primary disabled:opacity-25 p-1.5 shrink-0 transition-colors disabled:cursor-not-allowed", children: /* @__PURE__ */ jsx(SendHorizontal, { className: "h-5 w-5" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center justify-between text-[11px] text-muted-foreground", children: [
        /* @__PURE__ */ jsx("span", { children: sendMode === "enter" ? "Enter para enviar, Shift + Enter para nova linha." : "Ctrl + Enter para enviar, Shift + Enter para nova linha." }),
        /* @__PURE__ */ jsx("span", { children: mobileExperience ? "Modo móvel ativado: controles maiores e toque facilitado." : "Toque para ativar controles móveis em configurações." })
      ] })
    ] })
  ] });
}
async function uploadFile(file, conversationId) {
  try {
    const apiUrl = "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversation_id", conversationId);
    const res = await fetch(`${apiUrl}/api/upload-dm`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: formData
    });
    if (!res.ok) return toast.error("Upload falhou");
  } catch {
    toast.error("Erro no upload");
  }
}
export {
  DMChat as component
};
