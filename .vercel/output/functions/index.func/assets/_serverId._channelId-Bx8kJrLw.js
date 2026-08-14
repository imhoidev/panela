import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { Link, useParams } from "@tanstack/react-router";
import { useState, useCallback, createContext, useContext, memo, useRef, useMemo, useEffect } from "react";
import { s as supabase, u as useAuth, c as useServerContext } from "./router-mRNo7IUv.js";
import { useQueryClient, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { u as useRealtimeSocket } from "./useRealtime-Cqf46s7E.js";
import { Virtuoso } from "react-virtuoso";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { U as UsernameBadge } from "./UsernameBadge-BFbH-T_u.js";
import { P as Popover, b as PopoverTrigger, a as PopoverContent, R as ReportDialog, S as Skeleton } from "./ModPanel-BYNGaQNI.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { I as Input } from "./input-D_U8fI25.js";
import { M as MediaAttachment } from "./MediaLightbox-DK316uU7.js";
import { Pin, CornerUpLeft, Check, X, Paperclip, Smile, Pencil, Trash2, Hash, Shield, Upload, SendHorizontal, Users, Circle, Search, Crown, Wrench, Phone, Loader2, Sparkles, PhoneOff, Maximize2, Monitor, Camera, Mic, MicOff, Menu, MessageSquareText, ScrollText, MessageSquare, Volume2 } from "lucide-react";
import { S as ScrollArea } from "./scroll-area-JK6xafWT.js";
import { LiveKitRoom, ControlBar, RoomAudioRenderer, useRemoteParticipants, useLocalParticipant, useTracks, TrackRefContext, ParticipantTile } from "@livekit/components-react";
import { Track } from "livekit-client";
import { S as Sheet, e as SheetTrigger, a as SheetContent } from "./sheet-DQ5cLgT7.js";
import "@supabase/supabase-js";
import "socket.io-client";
import "@radix-ui/react-avatar";
import "./badge-YM7oB01y.js";
import "class-variance-authority";
import "@radix-ui/react-popover";
import "./responsive-dialog-B76QsuFm.js";
import "./dialog-BzLIvjno.js";
import "@radix-ui/react-dialog";
import "vaul";
import "./label-C8WJLhmR.js";
import "@radix-ui/react-label";
import "./select-aG-zsZPc.js";
import "@radix-ui/react-select";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-scroll-area";
const PAGE_SIZE = 50;
function queryKeyFor(channelId) {
  return ["chat", "channel", channelId, "messages"];
}
async function batchFetchProfiles(authorIds) {
  if (!authorIds.length) return /* @__PURE__ */ new Map();
  const { data } = await supabase.from("profiles").select("id, username, display_name, avatar_url, name_color, name_colors, name_effect, current_plan").in("id", authorIds);
  const map = /* @__PURE__ */ new Map();
  for (const p of data ?? []) map.set(p.id, p);
  return map;
}
function addToCache(qc, key, msg) {
  qc.setQueryData(key, (old) => {
    if (!old?.pages?.length) return old;
    const pages = old.pages.slice();
    pages[0] = { ...pages[0], messages: [...pages[0].messages, msg] };
    return { ...old, pages };
  });
}
function removeFromCache(qc, key, id) {
  qc.setQueryData(key, (old) => {
    if (!old?.pages?.length) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({ ...p, messages: p.messages.filter((m) => m.id !== id) }))
    };
  });
}
function updateInCache(qc, key, id, patch) {
  qc.setQueryData(key, (old) => {
    if (!old?.pages?.length) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        messages: p.messages.map((m) => m.id === id ? { ...m, ...patch } : m)
      }))
    };
  });
}
function useChat(channelId, userId) {
  const qc = useQueryClient();
  const qk = queryKeyFor(channelId);
  const messagesQuery = useInfiniteQuery({
    queryKey: qk,
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const builder = supabase.from("messages").select("*").eq("channel_id", channelId).is("thread_root", null).order("created_at", { ascending: false }).limit(PAGE_SIZE);
      const { data, error } = pageParam ? await builder.lt("created_at", pageParam) : await builder;
      if (error) throw error;
      const items = data ?? [];
      items.reverse();
      const profileMap = await batchFetchProfiles(
        [...new Set(items.map((m) => m.author_id).filter(Boolean))]
      );
      for (const m of items) m.author = profileMap.get(m.author_id) ?? null;
      return {
        messages: items,
        nextCursor: items.length === PAGE_SIZE ? items[0].created_at : null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!channelId,
    staleTime: 15e3
  });
  const sendMessage = useMutation({
    mutationFn: async (payload) => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from("messages").insert({
        channel_id: channelId,
        author_id: uid,
        ...payload
      }).select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData(qk);
      const temp = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        author_id: userId ?? "",
        content: payload.content ?? null,
        reply_to: payload.reply_to ?? null,
        thread_root: payload.thread_root ?? null,
        edited_at: null,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        status: "sending",
        _temp: true
      };
      addToCache(qc, qk, temp);
      return { prev, tempId: temp.id };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.tempId) removeFromCache(qc, qk, ctx.tempId);
      const err = _err;
      if (err?.code === "42501") toast.error("Você está silenciado neste servidor.");
      else toast.error(err.message || "Erro ao enviar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk })
  });
  const editMessage = useMutation({
    mutationFn: async ({ id, content }) => {
      const { error } = await supabase.from("messages").update({ content, edited_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, content }) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData(qk);
      updateInCache(qc, qk, id, { content, edited_at: (/* @__PURE__ */ new Date()).toISOString() });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
      toast.error(_err?.message || "Erro ao editar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk })
  });
  const deleteMessage = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData(qk);
      removeFromCache(qc, qk, id);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
      toast.error(_err?.message || "Erro ao deletar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk })
  });
  const togglePinMessage = useMutation({
    mutationFn: async ({ id, isPinned }) => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from("messages").update({
        is_pinned: isPinned,
        pinned_at: isPinned ? (/* @__PURE__ */ new Date()).toISOString() : null,
        pinned_by: isPinned ? uid : null
      }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, isPinned }) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData(qk);
      updateInCache(qc, qk, id, { is_pinned: isPinned });
      return { prev };
    },
    onSuccess: (_, { isPinned }) => {
      toast.success(isPinned ? "Mensagem fixada!" : "Mensagem desfixada!");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
      toast.error(_err?.message || "Erro ao fixar/desfixar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk })
  });
  return {
    messages: (messagesQuery.data?.pages.slice().reverse().flatMap((p) => p.messages) ?? []).filter((m) => !m._temp),
    tempMessages: (messagesQuery.data?.pages.slice().reverse().flatMap((p) => p.messages) ?? []).filter((m) => m._temp),
    isLoading: messagesQuery.isLoading,
    isFetchingMore: messagesQuery.isFetchingNextPage,
    hasMore: Boolean(messagesQuery.hasNextPage),
    fetchMore: messagesQuery.fetchNextPage,
    refresh: messagesQuery.refetch,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage
  };
}
function useChatCache(channelId) {
  const qc = useQueryClient();
  const qk = queryKeyFor(channelId);
  return {
    addMessage: (m) => addToCache(qc, qk, m),
    removeMessage: (id) => removeFromCache(qc, qk, id),
    updateMessage: (id, patch) => updateInCache(qc, qk, id, patch),
    invalidate: () => qc.invalidateQueries({ queryKey: qk })
  };
}
const ChatContext = createContext(null);
function ChatProvider({ userId, children }) {
  const [replyTo, setReplyTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [roleCache, setRoleCache] = useState(/* @__PURE__ */ new Map());
  const setEditing = useCallback((m) => {
    setEditingId(m?.id ?? null);
    setEditText(m?.content ?? "");
  }, []);
  const cancelReply = useCallback(() => setReplyTo(null), []);
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText("");
  }, []);
  return /* @__PURE__ */ jsx(ChatContext.Provider, { value: {
    replyTo,
    setReplyTo,
    cancelReply,
    editingId,
    editText,
    setEditing,
    setEditText,
    cancelEdit,
    roleCache,
    setRoleCache,
    userId
  }, children });
}
function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
const EMOJIS = ["👍", "❤️", "🔥", "😂", "🥹", "🤝", "👀", "🎉", "💯", "🍳"];
function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 5e3) return "agora";
  if (diff < 6e4) return `${Math.floor(diff / 1e3)}s`;
  if (diff < 36e5) return `${Math.floor(diff / 6e4)}m`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)}h`;
  if (diff < 1728e5) return "ontem";
  if (diff < 6048e5) return `${Math.floor(diff / 864e5)}d`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
function reactionsGrouped(all, msgId) {
  const map = /* @__PURE__ */ new Map();
  for (const r of all) {
    if (r.message_id !== msgId) continue;
    const arr = map.get(r.emoji) ?? [];
    arr.push(r);
    map.set(r.emoji, arr);
  }
  return Array.from(map.entries());
}
const MessageItem = memo(function MessageItem2({
  message: m,
  sameAuthor,
  replied,
  reactions,
  isTemp,
  onReact,
  onDelete,
  onSaveEdit,
  onTogglePin
}) {
  const { userId, roleCache, editingId, editText, setEditing, setEditText, cancelEdit, setReplyTo } = useChatContext();
  const myRx = reactionsGrouped(reactions, m.id);
  const roles = roleCache.get(m.author_id) ?? [];
  const topRole = [...roles].sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
  const isEditing = editingId === m.id;
  return /* @__PURE__ */ jsxs("div", { className: `group relative flex gap-2.5 px-2 py-0.5 rounded-lg hover:bg-accent/10 transition-colors ${sameAuthor ? "pl-[3.25rem]" : "pt-1.5"} ${isTemp ? "opacity-60" : ""} ${m.is_pinned ? "bg-amber-500/5 border-l-2 border-amber-500/40" : ""}`, children: [
    !sameAuthor ? /* @__PURE__ */ jsx(
      Link,
      {
        to: "/app/u/$slug",
        params: { slug: m.author_id },
        className: "h-9 w-9 mt-0.5 shrink-0 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary/40 transition-all shadow-sm",
        children: /* @__PURE__ */ jsxs(Avatar, { className: "h-full w-full", children: [
          /* @__PURE__ */ jsx(AvatarImage, { src: m.author?.avatar_url ?? void 0 }),
          /* @__PURE__ */ jsx(AvatarFallback, { className: "text-xs bg-muted/50", children: (m.author?.username ?? "?")[0]?.toUpperCase() })
        ] })
      }
    ) : /* @__PURE__ */ jsx("div", { className: "w-9 shrink-0 text-right pt-0.5", children: /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity select-none cursor-default", children: relativeTime(m.created_at) }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 -mt-0.5", children: [
      m.is_pinned && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 text-[11px] text-amber-400/90 font-medium mb-1", children: [
        /* @__PURE__ */ jsx(Pin, { className: "h-3 w-3 fill-amber-400/30" }),
        /* @__PURE__ */ jsx("span", { children: "Mensagem fixada" })
      ] }),
      replied && /* @__PURE__ */ jsxs("div", { className: "text-xs text-muted-foreground/60 flex items-center gap-1 mb-0.5 truncate border-l-2 border-primary/30 pl-2 hover:border-primary/50 transition-colors", children: [
        /* @__PURE__ */ jsx(CornerUpLeft, { className: "h-3 w-3 shrink-0" }),
        /* @__PURE__ */ jsxs("span", { className: "font-medium text-foreground/60", children: [
          "@",
          replied.author?.username ?? "alguém"
        ] }),
        /* @__PURE__ */ jsx("span", { className: "truncate opacity-70", children: replied.content })
      ] }),
      !sameAuthor && /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-1.5 flex-wrap", children: [
        m.author ? /* @__PURE__ */ jsx(UsernameBadge, { profile: m.author }) : /* @__PURE__ */ jsx("span", { className: "text-sm text-muted-foreground", children: "…" }),
        topRole && (topRole.gif_tag_url ? /* @__PURE__ */ jsx("img", { src: topRole.gif_tag_url, alt: "", className: "h-4 w-4 rounded-sm object-cover shrink-0", title: topRole.name }) : /* @__PURE__ */ jsx(
          "span",
          {
            className: "text-[10px] font-medium leading-none px-1.5 py-0.5 rounded shrink-0",
            style: { color: topRole.color || void 0, backgroundColor: topRole.color ? `${topRole.color}18` : "bg-accent/40" },
            children: topRole.name
          }
        )),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground/40", title: new Date(m.created_at).toLocaleString("pt-BR"), children: relativeTime(m.created_at) })
      ] }),
      isEditing ? /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center mt-1", children: [
        /* @__PURE__ */ jsx(
          Input,
          {
            autoFocus: true,
            value: editText,
            onChange: (e) => setEditText(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Escape") cancelEdit();
              if (e.key === "Enter") onSaveEdit();
            },
            className: "h-9 text-sm bg-accent/20 border-border/60"
          }
        ),
        /* @__PURE__ */ jsx(Button, { size: "icon", onClick: onSaveEdit, className: "h-9 w-9 shrink-0", children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }),
        /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: cancelEdit, className: "h-9 w-9 shrink-0", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }) : /* @__PURE__ */ jsxs("div", { className: "mt-0.5", children: [
        m.content && /* @__PURE__ */ jsx("div", { className: "text-sm prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1 prose-pre:bg-muted/80 prose-code:text-primary/80 prose-a:text-primary prose-img:rounded-lg", children: /* @__PURE__ */ jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: m.content }) }),
        m.edited_at && /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground/30 ml-1", children: "(editado)" }),
        m.attachment_url && /* @__PURE__ */ jsx(MediaAttachment, { url: m.attachment_url, type: m.attachment_type, children: /* @__PURE__ */ jsx("div", { className: "mt-1.5 inline-flex items-center gap-2.5 rounded-lg border border-border/50 bg-accent/15 px-3 py-2 text-sm hover:bg-accent/30 transition-colors cursor-pointer", children: m.attachment_type?.startsWith("image/") ? /* @__PURE__ */ jsx("img", { src: m.attachment_url, alt: "attachment", className: "max-h-48 rounded-lg object-contain shadow-sm" }) : m.attachment_type?.startsWith("video/") ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("video", { src: m.attachment_url, className: "max-h-48 rounded-lg object-contain" }),
          /* @__PURE__ */ jsx("div", { className: "absolute inset-0 grid place-items-center", children: /* @__PURE__ */ jsx("div", { className: "h-12 w-12 rounded-full bg-black/50 grid place-items-center", children: /* @__PURE__ */ jsx("span", { className: "text-white text-2xl ml-0.5", children: "▶" }) }) })
        ] }) }) : m.attachment_type?.startsWith("audio/") ? /* @__PURE__ */ jsx("audio", { src: m.attachment_url, controls: true, className: "max-w-full", onClick: (e) => e.stopPropagation() }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Paperclip, { className: "h-4 w-4 text-muted-foreground" }),
          /* @__PURE__ */ jsx("span", { className: "truncate text-muted-foreground", children: m.attachment_url.split("/").pop() })
        ] }) }) })
      ] }),
      myRx.length > 0 && /* @__PURE__ */ jsx("div", { className: "mt-1.5 flex flex-wrap gap-1", children: myRx.map(([emoji, list]) => {
        const mine = list.some((r) => r.user_id === userId);
        return /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => onReact(m, emoji),
            className: `text-xs rounded-full border px-1.5 py-0.5 flex items-center gap-1 transition-all touch-manipulation ${mine ? "bg-primary/15 border-primary/30 text-primary shadow-sm" : "bg-accent/30 border-border/50 text-muted-foreground hover:bg-accent/60 hover:border-border/70"}`,
            children: [
              /* @__PURE__ */ jsx("span", { children: emoji }),
              /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium", children: list.length })
            ]
          },
          emoji
        );
      }) })
    ] }),
    !isTemp && /* @__PURE__ */ jsxs("div", { className: "absolute -top-2.5 right-2 hidden group-hover:flex items-center gap-0.5 rounded-lg border border-border/50 bg-card/95 backdrop-blur-md shadow-md px-1 py-0.5 z-10", children: [
      /* @__PURE__ */ jsxs(Popover, { children: [
        /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { className: "p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors rounded hover:bg-accent/60 touch-manipulation", children: /* @__PURE__ */ jsx(Smile, { className: "h-4 w-4" }) }) }),
        /* @__PURE__ */ jsx(PopoverContent, { className: "p-1.5 w-auto", side: "top", align: "start", children: /* @__PURE__ */ jsx("div", { className: "flex gap-0.5 flex-wrap max-w-[200px]", children: EMOJIS.map((e) => /* @__PURE__ */ jsx("button", { onClick: () => onReact(m, e), className: "text-lg hover:bg-accent rounded p-1.5 sm:p-1 transition-colors touch-manipulation", children: e }, e)) }) })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => setReplyTo(m), title: "Responder", className: "p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors rounded hover:bg-accent/60 touch-manipulation", children: /* @__PURE__ */ jsx(CornerUpLeft, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx("button", { onClick: () => onTogglePin?.(m), title: m.is_pinned ? "Desfixar" : "Fixar", className: `p-1.5 transition-colors rounded hover:bg-accent/60 touch-manipulation ${m.is_pinned ? "text-amber-400" : "hover:text-foreground text-muted-foreground/50"}`, children: /* @__PURE__ */ jsx(Pin, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx("button", { onClick: () => setEditing(m), title: "Editar", className: "p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors rounded hover:bg-accent/60 touch-manipulation", children: /* @__PURE__ */ jsx(Pencil, { className: "h-4 w-4" }) }),
      m.author_id === userId && /* @__PURE__ */ jsx("button", { onClick: () => onDelete(m), title: "Apagar", className: "p-1.5 text-destructive/70 hover:text-destructive transition-colors rounded hover:bg-destructive/10 touch-manipulation", children: /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx(ReportDialog, { messageId: m.id, channelId: m.channel_id })
    ] })
  ] });
});
function getDateLabel(date) {
  const d = new Date(date);
  const now = /* @__PURE__ */ new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  if (d >= weekAgo) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function SkeletonMessages() {
  return /* @__PURE__ */ jsx("div", { className: "flex-1 px-5 py-4 space-y-4 overflow-hidden", children: [1, 2, 3, 4].map((i) => /* @__PURE__ */ jsxs("div", { className: "flex gap-3 animate-pulse", children: [
    /* @__PURE__ */ jsx(Skeleton, { className: "h-9 w-9 rounded-full shrink-0 bg-accent/30" }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 space-y-2.5 pt-1", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5", children: [
        /* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-24 rounded bg-accent/30" }),
        /* @__PURE__ */ jsx(Skeleton, { className: "h-2 w-12 rounded bg-accent/20" })
      ] }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-3/4 rounded bg-accent/20" }),
      /* @__PURE__ */ jsx(Skeleton, { className: "h-3 w-1/2 rounded bg-accent/15" })
    ] })
  ] }, i)) });
}
function EmptyState({ channelName, isAnnouncement }) {
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col items-center justify-center text-center text-muted-foreground px-6", children: [
    /* @__PURE__ */ jsx("div", { className: "h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mb-4 shadow-sm", children: /* @__PURE__ */ jsx(Hash, { className: "h-6 w-6 text-primary/60" }) }),
    /* @__PURE__ */ jsxs("p", { className: "font-semibold text-foreground/80", children: [
      "Bem-vindo a ",
      /* @__PURE__ */ jsxs("span", { className: "text-primary", children: [
        "#",
        channelName
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-sm mt-1.5 max-w-xs text-muted-foreground/60", children: isAnnouncement ? "Anuncios importantes serao publicados aqui." : "Esse e o comeco do canal." })
  ] });
}
function MessageList({
  messages,
  tempMessages,
  reactions,
  isLoading,
  hasMore,
  fetchMore,
  isRules,
  isForum,
  isAnnouncement,
  channelName,
  channelDescription,
  onReact,
  onDelete,
  onSaveEdit,
  onTogglePin
}) {
  const virtuosoRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const { roleCache, userId, editingId, editText, setEditing, setEditText, cancelEdit } = useChatContext();
  const allMessages = useMemo(() => {
    if (tempMessages.length > 0) return [...messages, ...tempMessages];
    return messages;
  }, [messages, tempMessages]);
  const items = useMemo(() => {
    if (isRules) return [];
    if (allMessages.length === 0) return [];
    return allMessages.map((m, i) => {
      const prev = allMessages[i - 1];
      const showDateSep = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
      const sameAuthor = prev && prev.author_id === m.author_id && !m.reply_to && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 6e4;
      const replied = m.reply_to ? allMessages.find((x) => x.id === m.reply_to) ?? null : null;
      return { message: m, sameAuthor, replied, showDateSep, key: m.id };
    });
  }, [allMessages, isRules]);
  const handleScrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: items.length - 1, behavior: "smooth" });
    setShowScrollBtn(false);
  }, [items.length]);
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) fetchMore();
  }, [hasMore, isLoading, fetchMore]);
  if (isRules) return null;
  if (isLoading && items.length === 0) return /* @__PURE__ */ jsx(SkeletonMessages, {});
  if (items.length === 0) {
    return /* @__PURE__ */ jsx(EmptyState, { channelName, isAnnouncement });
  }
  return /* @__PURE__ */ jsxs("div", { className: "flex-1 relative min-h-0", children: [
    /* @__PURE__ */ jsx(
      Virtuoso,
      {
        ref: virtuosoRef,
        className: "h-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb:hover]:bg-border/60 [&::-webkit-scrollbar-track]:bg-transparent",
        data: items,
        followOutput: atBottom ? "smooth" : false,
        atBottomStateChange: (bottom) => {
          setAtBottom(bottom);
          setShowScrollBtn(!bottom);
        },
        startReached: handleLoadMore,
        itemContent: (index, item) => {
          const { message, sameAuthor, replied, showDateSep } = item;
          return /* @__PURE__ */ jsxs("div", { children: [
            showDateSep && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 my-4 px-5", children: [
              /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border/30" }),
              /* @__PURE__ */ jsx("span", { className: "text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-wider shrink-0", children: getDateLabel(message.created_at) }),
              /* @__PURE__ */ jsx("div", { className: "flex-1 h-px bg-border/30" })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "px-2 sm:px-5", children: /* @__PURE__ */ jsx(
              MessageItem,
              {
                message,
                sameAuthor,
                replied,
                reactions,
                isTemp: message.status === "sending",
                onReact,
                onDelete,
                onSaveEdit,
                onTogglePin
              }
            ) })
          ] });
        },
        components: {
          Header: hasMore ? () => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground/60", children: [
            /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce", style: { animationDelay: "0ms" } }),
            /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce", style: { animationDelay: "150ms" } }),
            /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce", style: { animationDelay: "300ms" } })
          ] }) : void 0
        }
      }
    ),
    showScrollBtn && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: handleScrollToBottom,
        className: "absolute bottom-4 right-6 h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 grid place-items-center hover:bg-primary/90 transition-all z-10 touch-manipulation",
        children: /* @__PURE__ */ jsx("svg", { className: "h-5 w-5 text-primary-foreground", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M19 14l-7 7m0 0l-7-7m7 7V3" }) })
      }
    )
  ] });
}
async function searchGifs(query) {
  return [];
}
function GifPicker({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchGifs();
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);
  return /* @__PURE__ */ jsxs("div", { className: "w-72", children: [
    /* @__PURE__ */ jsx(Input, { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Buscar GIFs…", className: "mb-2 h-9 text-sm" }),
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto", children: [
      loading && /* @__PURE__ */ jsx("p", { className: "col-span-2 text-xs text-muted-foreground text-center py-4", children: "Buscando…" }),
      !loading && results.map((g) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => onSelect(g.media_formats.tinygif?.url || g.media_formats.gif?.url),
          className: "rounded overflow-hidden hover:ring-2 ring-primary transition-all",
          children: /* @__PURE__ */ jsx("img", { src: g.media_formats.tinygif?.url, alt: "", className: "w-full h-20 object-cover" })
        },
        g.id
      )),
      !loading && query && !results.length && /* @__PURE__ */ jsx("p", { className: "col-span-2 text-xs text-muted-foreground text-center py-4", children: "Nada encontrado" })
    ] })
  ] });
}
function StickerPicker({ onSelect, serverId }) {
  const [stickers, setStickers] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (!serverId) return;
    supabase.from("sticker_packs").select("id").eq("server_id", serverId).then(({ data: packs }) => {
      if (!packs?.length) {
        setStickers([]);
        return;
      }
      const ids = packs.map((p) => p.id);
      let q = supabase.from("stickers").select("id, url, name").in("pack_id", ids);
      if (search.trim()) q = q.ilike("name", `%${search}%`);
      q.limit(40).then(({ data }) => setStickers(data ?? []));
    });
  }, [serverId, search]);
  return /* @__PURE__ */ jsxs("div", { className: "w-64", children: [
    /* @__PURE__ */ jsx(Input, { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Buscar sticker…", className: "mb-2 h-9 text-sm" }),
    /* @__PURE__ */ jsx(ScrollArea, { className: "max-h-60", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-4 gap-1.5", children: [
      stickers.map((s) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => onSelect(s.url),
          className: "rounded overflow-hidden hover:ring-2 ring-primary transition-all p-1",
          children: /* @__PURE__ */ jsx("img", { src: s.image_url || s.url, alt: s.name, className: "w-full aspect-square object-contain" })
        },
        s.id
      )),
      !stickers.length && /* @__PURE__ */ jsx("p", { className: "col-span-4 text-xs text-muted-foreground text-center py-4", children: "Nenhum sticker" })
    ] }) })
  ] });
}
function MessageInput({
  channelName,
  sending,
  uploading,
  canPost,
  isAnnouncement,
  isRules,
  serverId,
  text,
  onTextChange,
  onSubmit,
  onUploadFile,
  onInsertGif,
  onInsertSticker,
  onEmitTyping
}) {
  const fileRef = useRef(null);
  const textareaRef = useRef(null);
  const debounceRef = useRef(null);
  const { replyTo, cancelReply } = useChatContext();
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);
  const emitTypingDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onEmitTyping();
    debounceRef.current = setTimeout(() => {
    }, 300);
  }, [onEmitTyping]);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);
  useEffect(() => {
    const onDragEnter = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const onDragOver = (e) => {
      e.preventDefault();
      setDragging(true);
    };
    const onDragLeave = (e) => {
      if (e.relatedTarget && e.relatedTarget.parentNode === document.body) setDragging(false);
    };
    const onDrop = (e) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) onUploadFile(f);
    };
    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [onUploadFile]);
  if (isRules || isAnnouncement) {
    return /* @__PURE__ */ jsx("div", { className: "px-2 sm:px-5 pb-2 sm:pb-3 pt-1 border-t border-border/40 bg-card/10 shrink-0", children: canPost ? /* @__PURE__ */ jsx("form", { onSubmit, children: /* @__PURE__ */ jsx(
      "textarea",
      {
        ref: textareaRef,
        value: text,
        onChange: (e) => {
          onTextChange(e.target.value);
        },
        placeholder: `Mensagem em #${channelName}`,
        className: "w-full bg-card/80 backdrop-blur rounded-xl border border-border/60 min-h-[44px] px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus-visible:border-primary/30 resize-none outline-none",
        maxLength: 2e3,
        rows: 1
      }
    ) }) : /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-4 py-3 rounded-xl bg-card/50 border border-border/40 text-xs text-muted-foreground/60", children: [
      /* @__PURE__ */ jsx(Shield, { className: "h-4 w-4 shrink-0 text-muted-foreground/40" }),
      /* @__PURE__ */ jsx("span", { children: isAnnouncement ? "Apenas moderadores podem publicar anuncios." : "Apenas moderadores podem comentar sobre as regras." })
    ] }) });
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    dragging && /* @__PURE__ */ jsx("div", { className: "absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-primary/50 m-2", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3 text-primary/70", children: [
      /* @__PURE__ */ jsx(Upload, { className: "h-10 w-10" }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-semibold", children: "Solte os arquivos aqui" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground/60", children: [
        "para enviar para #",
        channelName
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("form", { onSubmit, className: "px-2 sm:px-5 pb-2 sm:pb-3 pt-1 border-t border-border/40 bg-card/20 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0 relative", children: [
      replyTo && /* @__PURE__ */ jsxs("div", { className: "mb-2 text-xs flex items-center justify-between px-3 py-2 rounded-lg bg-accent/20 border border-border/50", children: [
        /* @__PURE__ */ jsxs("span", { className: "truncate flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(CornerUpLeft, { className: "inline h-3 w-3 shrink-0 text-primary/60" }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/70", children: "respondendo" }),
          /* @__PURE__ */ jsxs("span", { className: "font-medium text-foreground/80", children: [
            "@",
            replyTo.author?.username ?? "alguém"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "text-muted-foreground/50 hidden sm:inline truncate", children: [
            ": ",
            replyTo.content
          ] })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: cancelReply, className: "p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors touch-manipulation", children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-end gap-1 bg-card/90 backdrop-blur-xl rounded-2xl border border-border/50 px-2 py-1.5 shadow-sm shadow-black/5 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/15 transition-all", children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            ref: fileRef,
            className: "hidden",
            onChange: (e) => {
              const f = e.target.files?.[0];
              if (f) onUploadFile(f);
              e.target.value = "";
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: uploading,
            onClick: () => fileRef.current?.click(),
            className: "text-muted-foreground/50 hover:text-foreground disabled:opacity-30 p-2.5 shrink-0 transition-colors self-end touch-manipulation",
            title: "Anexar arquivo",
            children: /* @__PURE__ */ jsx(Paperclip, { className: "h-5 w-5" })
          }
        ),
        /* @__PURE__ */ jsxs(Popover, { children: [
          /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground/50 hover:text-foreground text-xs font-bold px-2.5 min-h-[44px] shrink-0 transition-colors self-end touch-manipulation", children: "GIF" }) }),
          /* @__PURE__ */ jsx(PopoverContent, { side: "top", className: "w-auto p-2", align: "start", children: /* @__PURE__ */ jsx(GifPicker, { onSelect: onInsertGif }) })
        ] }),
        /* @__PURE__ */ jsxs(Popover, { children: [
          /* @__PURE__ */ jsx(PopoverTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { type: "button", className: "text-muted-foreground/50 hover:text-foreground p-2.5 shrink-0 transition-colors self-end touch-manipulation", children: /* @__PURE__ */ jsx(Smile, { className: "h-5 w-5" }) }) }),
          /* @__PURE__ */ jsx(PopoverContent, { side: "top", className: "w-auto p-2", align: "start", children: /* @__PURE__ */ jsx(StickerPicker, { onSelect: onInsertSticker, serverId }) })
        ] }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            ref: textareaRef,
            value: text,
            onChange: (e) => {
              onTextChange(e.target.value);
              emitTypingDebounced();
            },
            placeholder: `Mensagem em #${channelName}`,
            className: "bg-transparent border-0 flex-1 min-w-0 px-2 py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/40 resize-none outline-none max-h-[160px] min-h-[44px]",
            maxLength: 2e3,
            rows: 1,
            onKeyDown: (e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e);
              }
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "submit",
            disabled: !text.trim() || sending,
            className: "text-primary/60 hover:text-primary disabled:opacity-25 p-2.5 shrink-0 transition-colors disabled:cursor-not-allowed self-end touch-manipulation",
            title: "Enviar (Enter)",
            children: /* @__PURE__ */ jsx(SendHorizontal, { className: "h-5 w-5" })
          }
        )
      ] })
    ] })
  ] });
}
function ChatInner({
  channelId,
  serverId,
  channelName,
  channelType,
  channelDescription,
  canPost,
  header,
  onReact: externalReact
}) {
  const { user, profile } = useAuth();
  useQueryClient();
  const { socket } = useRealtimeSocket();
  const { messages, tempMessages, isLoading, hasMore, fetchMore, sendMessage, editMessage, deleteMessage, togglePinMessage } = useChat(channelId, user?.id);
  async function handleTogglePin(m) {
    togglePinMessage.mutate({ id: m.id, isPinned: !m.is_pinned });
  }
  const cache = useChatCache(channelId);
  const [reactions, setReactions] = useState([]);
  const [typing, setTyping] = useState({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roleCache, setRoleCache] = useState(/* @__PURE__ */ new Map());
  const typingChan = useRef(null);
  const lastTypingSent = useRef(0);
  const knownIds = useRef(/* @__PURE__ */ new Set());
  const { editingId, editText, cancelEdit } = useChatContext();
  const isVoice = channelType === "voice";
  const isRules = channelType === "rules";
  const isAnnouncement = channelType === "announcement";
  const isForum = channelType === "forum";
  useEffect(() => {
    setReactions([]);
    if (serverId) loadRoles();
  }, [channelId]);
  async function loadRoles() {
    if (!serverId) return;
    const { data: allRoles } = await supabase.from("server_roles").select("id, name, color, gif_tag_url").eq("server_id", serverId);
    const rolesMap = new Map((allRoles ?? []).map((r) => [r.id, r]));
    const { data: memRoles } = await supabase.from("server_member_roles").select("member_id, role_id, server_members!inner(user_id)");
    const userRoles = /* @__PURE__ */ new Map();
    (memRoles ?? []).forEach((mr) => {
      const uid = mr.server_members?.user_id;
      if (!uid) return;
      const role = rolesMap.get(mr.role_id);
      if (!role) return;
      const list = userRoles.get(uid) ?? [];
      list.push(role);
      userRoles.set(uid, list);
    });
    setRoleCache(userRoles);
  }
  useEffect(() => {
    if (!messages.length) {
      setReactions([]);
      return;
    }
    let active = true;
    const ids = messages.map((m) => m.id);
    supabase.from("message_reactions").select("*").in("message_id", ids).then(({ data }) => {
      if (!active) return;
      setReactions(data ?? []);
    });
    return () => {
      active = false;
    };
  }, [channelId, messages.length]);
  useEffect(() => {
    if (isVoice) return;
    const ch = supabase.channel(`channel-${channelId}`).on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
      async (payload) => {
        const m = payload.new;
        if (m.thread_root || knownIds.current.has(m.id)) return;
        knownIds.current.add(m.id);
        cache.addMessage(m);
      }
    ).on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
      (payload) => {
        cache.updateMessage(payload.new.id, payload.new);
      }
    ).on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
      (payload) => {
        const id = payload.old.id;
        knownIds.current.delete(id);
        cache.removeMessage(id);
      }
    ).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_reactions" },
      (payload) => {
        if (payload.eventType === "INSERT") setReactions((p) => [...p, payload.new]);
        else if (payload.eventType === "DELETE") setReactions((p) => p.filter((r) => r.id !== payload.old.id));
      }
    ).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId, isVoice]);
  useEffect(() => {
    if (!socket || isVoice) return;
    const onConnect = () => {
      socket.emit("channel:join", channelId);
    };
    const onMessageNew = async (m) => {
      if (knownIds.current.has(m.id) || m.thread_root) return;
      knownIds.current.add(m.id);
      cache.addMessage(m);
    };
    const onMessageDeleted = ({ messageId }) => {
      knownIds.current.delete(messageId);
      cache.removeMessage(messageId);
    };
    const onMessageUpdated = (m) => cache.updateMessage(m.id, m);
    const onTypingStart = ({ userId: uid, username }) => {
      if (uid === user?.id) return;
      setTyping((prev) => ({ ...prev, [uid]: { name: username, t: Date.now() } }));
    };
    const onTypingStop = ({ userId: uid }) => {
      setTyping((prev) => {
        const next = {};
        Object.entries(prev).forEach(([key, value]) => {
          if (key !== uid) next[key] = value;
        });
        return next;
      });
    };
    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("message:new", onMessageNew);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:updated", onMessageUpdated);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    return () => {
      socket.off("connect", onConnect);
      socket.off("message:new", onMessageNew);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:updated", onMessageUpdated);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.emit("channel:leave", channelId);
    };
  }, [socket, channelId, isVoice, user?.id]);
  useEffect(() => {
    if (!user || isVoice) return;
    const ch = supabase.channel(`typing:${channelId}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload.userId === user.id) return;
      setTyping((prev) => ({ ...prev, [payload.userId]: { name: payload.username, t: Date.now() } }));
    });
    ch.subscribe();
    typingChan.current = ch;
    const interval = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.t < 4e3) next[k] = v;
        return next;
      });
    }, 1e3);
    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
      typingChan.current = null;
    };
  }, [user?.id, channelId, isVoice]);
  function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    if (socket) {
      socket.emit("typing:start", { channelId, username: profile?.display_name || profile?.username });
      return;
    }
    typingChan.current?.send({ type: "broadcast", event: "typing", payload: { userId: user.id, username: profile?.display_name || profile?.username } });
  }
  async function handleSend(e) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    const content = text.trim();
    setText("");
    setSending(true);
    try {
      const r = await sendMessage.mutateAsync({ content });
      if (r) {
        knownIds.current.add(r.id);
        if (socket) socket.emit("message:new", { channelId, message: r });
      }
    } catch {
    } finally {
      setSending(false);
    }
  }
  async function handleReact(m, emoji) {
    if (!user) return;
    if (externalReact) {
      await externalReact(m, emoji);
      return;
    }
    const mine = reactions.find((r) => r.message_id === m.id && r.emoji === emoji && r.user_id === user.id);
    if (mine) await supabase.from("message_reactions").delete().eq("id", mine.id);
    else await supabase.from("message_reactions").insert({ message_id: m.id, emoji, user_id: user.id });
  }
  async function handleDelete(m) {
    if (!confirm("Apagar essa mensagem?")) return;
    knownIds.current.delete(m.id);
    if (socket) socket.emit("message:deleted", { channelId, messageId: m.id });
    try {
      await deleteMessage.mutateAsync(m.id);
    } catch {
    }
  }
  async function handleSaveEdit() {
    if (!editingId) return;
    const c = editText.trim();
    if (!c) return;
    try {
      await editMessage.mutateAsync({ id: editingId, content: c });
      cancelEdit();
    } catch {
    }
  }
  async function handleUploadFile(file) {
    if (!user || uploading) return;
    setUploading(true);
    try {
      const apiUrl = "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("channel_id", channelId);
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: formData
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Upload falhou");
      }
      const { url } = await res.json();
      setText((prev) => prev + ` ${url} `);
      toast.success("Arquivo anexado");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }
  function insertGif(url) {
    setText((prev) => prev + ` ![gif](${url}) `);
  }
  function insertSticker(url) {
    setText((prev) => prev + ` ![sticker](${url}) `);
  }
  if (isVoice) return null;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full relative", children: [
    header,
    /* @__PURE__ */ jsx(
      MessageList,
      {
        messages,
        tempMessages,
        reactions,
        isLoading,
        hasMore: Boolean(hasMore),
        fetchMore,
        isRules,
        isForum,
        isAnnouncement,
        channelName,
        channelDescription,
        onReact: handleReact,
        onDelete: handleDelete,
        onSaveEdit: handleSaveEdit,
        onTogglePin: handleTogglePin
      }
    ),
    /* @__PURE__ */ jsx("div", { children: Object.values(typing).length > 0 && /* @__PURE__ */ jsxs("div", { className: "px-5 py-1 flex items-center gap-2 text-xs text-muted-foreground/60 italic", children: [
      /* @__PURE__ */ jsxs("span", { className: "flex gap-0.5", children: [
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce", style: { animationDelay: "0ms" } }),
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce", style: { animationDelay: "200ms" } }),
        /* @__PURE__ */ jsx("span", { className: "h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce", style: { animationDelay: "400ms" } })
      ] }),
      Object.values(typing).map((t) => t.name).join(", "),
      " digitando…"
    ] }) }),
    /* @__PURE__ */ jsx(
      MessageInput,
      {
        channelName,
        text,
        sending,
        uploading,
        canPost,
        isAnnouncement,
        isRules,
        serverId: serverId ?? "",
        onTextChange: setText,
        onSubmit: handleSend,
        onUploadFile: handleUploadFile,
        onInsertGif: insertGif,
        onInsertSticker: insertSticker,
        onEmitTyping: emitTyping
      }
    )
  ] });
}
function ChatContainer(props) {
  const { user } = useAuth();
  return /* @__PURE__ */ jsx(ChatProvider, { userId: user?.id, children: /* @__PURE__ */ jsx(ChatInner, { ...props }) });
}
const STATUS_META = {
  online: { label: "Online", dot: "bg-emerald-500", labelColor: "text-emerald-500/80" },
  idle: { label: "Ausente", dot: "bg-yellow-500", labelColor: "text-yellow-500/80" },
  dnd: { label: "Ocupado", dot: "bg-red-500", labelColor: "text-red-500/80" },
  invisible: { label: "Invisível", dot: "bg-muted-foreground/30", labelColor: "text-muted-foreground/60" },
  offline: { label: "Offline", dot: "bg-muted-foreground/30", labelColor: "text-muted-foreground/60" }
};
function statusPriority(s) {
  if (s === "online") return 0;
  if (s === "idle") return 1;
  if (s === "dnd") return 2;
  return 3;
}
function MemberList({
  serverId,
  presence
}) {
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!serverId) return;
    supabase.from("server_members").select("user_id, level").eq("server_id", serverId).then(async ({ data }) => {
      if (!data?.length) return;
      const userIds = data.map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, username, display_name, avatar_url, name_color, status_text, status").in("id", userIds);
      const profMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      setMembers(data.map((m) => ({ user_id: m.user_id, level: m.level, profile: profMap[m.user_id] || null })));
    });
  }, [serverId]);
  const filtered = [...members].sort((a, b) => {
    const aOrd = statusPriority(presence.get(a.user_id) || "offline");
    const bOrd = statusPriority(presence.get(b.user_id) || "offline");
    if (aOrd !== bOrd) return aOrd - bOrd;
    if (a.level !== b.level) return b.level - a.level;
    return (a.profile?.username || "").localeCompare(b.profile?.username || "");
  }).filter((m) => {
    if (!q.trim()) return true;
    const lq = q.toLowerCase();
    return m.profile?.username?.toLowerCase().includes(lq) || m.profile?.display_name?.toLowerCase().includes(lq);
  });
  const groups = ["online", "idle", "dnd", "offline"].map((key) => ({
    key,
    ...STATUS_META[key],
    members: filtered.filter((m) => {
      const s = presence.get(m.user_id) || "offline";
      if (key === "offline") return s === "offline" || s === "invisible" || !presence.has(m.user_id);
      return s === key;
    })
  }));
  const onlineCount = filtered.filter((m) => (presence.get(m.user_id) || "offline") !== "offline").length;
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col flex-1 min-h-0 bg-card/30 w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "h-[3.25rem] border-b border-border/50 flex items-center px-4 gap-2.5 shrink-0 bg-card/30 backdrop-blur-sm", children: [
      /* @__PURE__ */ jsx("div", { className: "h-7 w-7 rounded-lg bg-primary/10 grid place-items-center", children: /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5 text-primary/70" }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("p", { className: "text-[13px] font-semibold leading-tight truncate", children: "Membros" }),
        /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60 leading-tight flex items-center gap-1", children: [
          /* @__PURE__ */ jsx(Circle, { className: `h-1.5 w-1.5 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}` }),
          onlineCount,
          " online · ",
          filtered.length,
          " total"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "px-2.5 pt-2 pb-1 shrink-0", children: /* @__PURE__ */ jsxs("div", { className: "relative", children: [
      /* @__PURE__ */ jsx(Search, { className: "absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" }),
      /* @__PURE__ */ jsx(
        Input,
        {
          value: q,
          onChange: (e) => setQ(e.target.value),
          placeholder: "Buscar membro...",
          className: "pl-7 h-8 text-xs bg-accent/20 border-border/50 focus:bg-accent/40 transition-colors backdrop-blur-sm"
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxs(ScrollArea, { className: "flex-1 px-1.5 pb-2", children: [
      filtered.length === 0 && q.trim() && /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center py-10 text-muted-foreground/60", children: [
        /* @__PURE__ */ jsx(Hash, { className: "h-8 w-8 mb-2 opacity-40" }),
        /* @__PURE__ */ jsx("p", { className: "text-xs font-medium", children: "Ninguém encontrado" }),
        /* @__PURE__ */ jsx("p", { className: "text-[10px]", children: "Tente outro termo de busca" })
      ] }),
      groups.map((grp) => {
        if (!grp.members.length) return null;
        return /* @__PURE__ */ jsxs("div", { className: "mb-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 px-2 py-1.5", children: [
            /* @__PURE__ */ jsx("div", { className: `h-2 w-2 rounded-full ${grp.dot}` }),
            /* @__PURE__ */ jsx("p", { className: `text-[10px] uppercase tracking-wider font-semibold ${grp.labelColor}`, children: grp.label }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground/40 font-mono ml-auto", children: grp.members.length })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "space-y-px", style: { contentVisibility: "auto" }, children: grp.members.map((m) => /* @__PURE__ */ jsx(MemberRow, { member: m, status: grp.key }, m.user_id)) })
        ] }, grp.key);
      })
    ] })
  ] });
}
const MemberRow = memo(function MemberRow2({ member, status }) {
  const p = member.profile;
  const dot = STATUS_META[status]?.dot || STATUS_META.offline.dot;
  const icon = member.level >= 100 ? /* @__PURE__ */ jsx(Crown, { className: "h-3 w-3 text-yellow-500" }) : member.level >= 80 ? /* @__PURE__ */ jsx(Shield, { className: "h-3 w-3 text-blue-400" }) : member.level >= 60 ? /* @__PURE__ */ jsx(Wrench, { className: "h-3 w-3 text-green-400" }) : null;
  return /* @__PURE__ */ jsxs(
    Link,
    {
      to: "/app/u/$slug",
      params: { slug: member.user_id },
      className: "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-accent/30 transition-colors group",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "relative shrink-0", children: [
          /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 md:h-7 md:w-7 ring-1 ring-border/30 group-hover:ring-primary/40 transition-all", children: [
            /* @__PURE__ */ jsx(AvatarImage, { src: p?.avatar_url ?? void 0 }),
            /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[10px] bg-muted/50", children: (p?.username || "?")[0]?.toUpperCase() })
          ] }),
          /* @__PURE__ */ jsx("span", { className: `absolute -bottom-px -right-px h-2.5 w-2.5 rounded-full border-[2.5px] border-card ${dot}` })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx("span", { className: "text-sm truncate font-medium", style: p?.name_color ? { color: p.name_color } : void 0, children: p?.display_name || p?.username || "…" }),
            icon && /* @__PURE__ */ jsx("span", { className: "shrink-0", children: icon })
          ] }),
          p?.status_text && status !== "offline" && /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground/60 truncate leading-tight", children: p.status_text })
        ] })
      ]
    }
  );
});
const API_URL = "";
function VoiceRoom({ room, channelId, name, defaultJoined }) {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(!!defaultJoined);
  async function join() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const bearer = sess.session?.access_token;
      if (!bearer) throw new Error("Sem sessão");
      const r = await fetch(`${API_URL}/api/livekit/token`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${bearer}` },
        body: JSON.stringify({ room, channelId, name })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao gerar token");
      setToken(j);
      setJoined(true);
    } catch (e) {
      toast.error(e.message ?? "Erro ao entrar na sala");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (defaultJoined && !token && !loading) join();
  }, [defaultJoined]);
  if (!joined || !token) {
    return /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center h-full p-8 text-center gap-5", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute inset-0 rounded-full bg-primary/20 blur-2xl" }),
        /* @__PURE__ */ jsx("div", { className: "relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 grid place-items-center text-primary", children: /* @__PURE__ */ jsx(Phone, { className: "h-8 w-8" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5 max-w-sm", children: [
        /* @__PURE__ */ jsx("p", { className: "text-xl font-semibold", children: "Canal de voz" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Entre pra falar com a galera em tempo real. Microfone, câmera e tela." })
      ] }),
      /* @__PURE__ */ jsxs(Button, { onClick: join, disabled: loading, size: "lg", className: "min-w-[180px] h-11", children: [
        loading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }) : /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 mr-2" }),
        "Entrar na sala"
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(
    LiveKitRoom,
    {
      "data-lk-theme": "default",
      token: token.token,
      serverUrl: token.url,
      audio: true,
      video: false,
      connect: true,
      onDisconnected: () => {
        setJoined(false);
        setToken(null);
      },
      className: "h-full",
      children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full bg-gradient-to-b from-background to-card/40", children: [
          /* @__PURE__ */ jsx("div", { className: "flex-1 min-h-0 overflow-auto p-3 sm:p-4", children: /* @__PURE__ */ jsx(StageGrid, {}) }),
          /* @__PURE__ */ jsx("div", { className: "border-t border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 sm:px-5 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]", children: /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3", children: [
            /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2 sm:gap-3 rounded-full bg-background/60 border border-border px-2 sm:px-3 py-1.5 mx-auto sm:mx-0", children: /* @__PURE__ */ jsx(ControlBar, { variation: "minimal", controls: { microphone: true, camera: true, screenShare: true, chat: false, leave: false } }) }),
            /* @__PURE__ */ jsxs(
              Button,
              {
                variant: "destructive",
                size: "lg",
                className: "h-11 rounded-full px-5 shrink-0",
                onClick: () => {
                  setJoined(false);
                  setToken(null);
                },
                children: [
                  /* @__PURE__ */ jsx(PhoneOff, { className: "h-4 w-4 mr-2" }),
                  " Sair"
                ]
              }
            )
          ] }) })
        ] }),
        /* @__PURE__ */ jsx(RoomAudioRenderer, {})
      ]
    }
  );
}
function StageGrid() {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);
  const participants = [localParticipant, ...remoteParticipants].filter(Boolean);
  const count = participants.length;
  const cols = count <= 1 ? "grid-cols-1" : count <= 2 ? "grid-cols-2" : count <= 4 ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3";
  if (count === 0) {
    return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground/50 text-sm", children: "Ninguém na sala ainda" });
  }
  return /* @__PURE__ */ jsx("div", { className: `grid ${cols} gap-3 auto-rows-fr ${count === 1 ? "h-full" : ""}`, children: participants.map((p) => {
    const camTrack = cameraTracks.find((t) => t.participant.identity === p.identity);
    const screenTrack = screenTracks.find((t) => t.participant.identity === p.identity);
    const hasScreen = p.isScreenShareEnabled && screenTrack;
    const hasCam = p.isCameraEnabled && camTrack;
    const showVideo = hasScreen || hasCam;
    const trackRef = screenTrack || camTrack;
    return /* @__PURE__ */ jsxs(CardWrapper, { participant: p, isScreen: Boolean(hasScreen), children: [
      showVideo && trackRef ? /* @__PURE__ */ jsx(TrackRefContext.Provider, { value: trackRef, children: /* @__PURE__ */ jsx(ParticipantTile, { className: `h-full w-full ${hasScreen ? "[&_video]:object-contain" : "[&_video]:object-cover"}` }) }) : /* @__PURE__ */ jsx(ParticipantCard, { participant: p }),
      /* @__PURE__ */ jsx(ParticipantInfo, { participant: p })
    ] }, p.identity);
  }) });
}
function CardWrapper({ participant, isScreen, children }) {
  const ref = useRef(null);
  const [isFull, setIsFull] = useState(false);
  useEffect(() => {
    const handler = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);
  async function toggleFull() {
    if (isFull) {
      await document.exitFullscreen();
      return;
    }
    if (ref.current) await ref.current.requestFullscreen();
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref,
      className: `group relative rounded-2xl overflow-hidden bg-black/40 border-2 transition-all min-h-[120px] ${participant.isSpeaking ? "border-emerald-500/60 shadow-md" : "border-transparent"} ${isScreen ? "[&_video]:object-contain" : "[&_video]:object-cover"}`,
      children: [
        children,
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: toggleFull,
            className: "absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur grid place-items-center text-white/70 hover:text-white transition-all opacity-0 group-hover:opacity-100",
            title: isFull ? "Sair da tela cheia" : "Tela cheia",
            children: /* @__PURE__ */ jsx(Maximize2, { className: "h-3 w-3" })
          }
        )
      ]
    }
  );
}
function ParticipantCard({ participant }) {
  const name = participant.name || "Alguém";
  let avatarUrl = "";
  try {
    const m = participant.metadata ? JSON.parse(participant.metadata) : {};
    avatarUrl = m.avatar_url || "";
  } catch {
  }
  return /* @__PURE__ */ jsxs("div", { className: "h-full w-full flex flex-col items-center justify-center gap-2 p-4", children: [
    /* @__PURE__ */ jsxs(Avatar, { className: `h-14 w-14 ring-2 transition-all ${participant.isSpeaking ? "ring-emerald-500/50 ring-offset-2 ring-offset-black/20" : "ring-border/20"}`, children: [
      /* @__PURE__ */ jsx(AvatarImage, { src: avatarUrl || void 0 }),
      /* @__PURE__ */ jsx(AvatarFallback, { className: "text-lg font-bold", children: name[0]?.toUpperCase() || "?" })
    ] }),
    /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-foreground/80 truncate max-w-full", children: name }),
    participant.isSpeaking && /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-500 animate-pulse" })
  ] });
}
function ParticipantInfo({ participant }) {
  const micOn = participant.isMicrophoneEnabled !== false;
  const camOn = participant.isCameraEnabled;
  const screenOn = participant.isScreenShareEnabled;
  return /* @__PURE__ */ jsxs("div", { className: "absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur rounded-full px-2.5 py-1 text-[10px] text-white/80", children: [
    screenOn ? /* @__PURE__ */ jsx(Monitor, { className: "h-3 w-3 text-blue-400" }) : camOn ? /* @__PURE__ */ jsx(Camera, { className: "h-3 w-3" }) : null,
    micOn ? /* @__PURE__ */ jsx(Mic, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(MicOff, { className: "h-3 w-3 text-red-400" }),
    /* @__PURE__ */ jsx("span", { className: "truncate max-w-[80px]", children: participant.name || "Alguém" })
  ] });
}
function ChannelView() {
  const {
    serverId,
    channelId
  } = useParams({
    from: "/app/servers/$serverId/$channelId"
  });
  const [channel, setChannel] = useState(null);
  const ctx = useServerContext();
  useEffect(() => {
    let active = true;
    supabase.from("channels").select("*").eq("id", channelId).maybeSingle().then(({
      data
    }) => {
      if (!active) return;
      setChannel(data);
    });
    return () => {
      active = false;
    };
  }, [channelId]);
  if (!channel) return /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center h-full text-muted-foreground text-sm p-8", children: "Carregando canal…" });
  const isVoice = channel.type === "voice";
  const isRules = channel.type === "rules";
  const isAnnouncement = channel.type === "announcement";
  const isForum = channel.type === "forum";
  const canPost = (ctx?.canManage ?? false) || (ctx?.memberLevel ?? 0) >= 60 || !isRules && !isAnnouncement;
  const onlineCount = Array.from((ctx?.presence ?? /* @__PURE__ */ new Map()).values()).filter((s) => s !== "offline").length;
  function channelMeta(type) {
    switch (type) {
      case "voice":
        return {
          icon: Volume2,
          color: "text-emerald-500",
          bg: "bg-emerald-500/15"
        };
      case "announcement":
        return {
          icon: MessageSquare,
          color: "text-amber-500",
          bg: "bg-amber-500/15"
        };
      case "rules":
        return {
          icon: ScrollText,
          color: "text-rose-500",
          bg: "bg-rose-500/15"
        };
      case "forum":
        return {
          icon: MessageSquareText,
          color: "text-violet-500",
          bg: "bg-violet-500/15"
        };
      default:
        return {
          icon: Hash,
          color: "text-primary/70",
          bg: "bg-primary/10"
        };
    }
  }
  const {
    icon: ChanIcon,
    color: chanColor,
    bg: chanBg
  } = channelMeta(channel.type);
  const header = /* @__PURE__ */ jsxs("header", { className: "h-12 border-b border-border/50 px-3 sm:px-5 flex items-center gap-2.5 bg-card/30 backdrop-blur-md shrink-0 shadow-sm", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center gap-1 md:hidden", children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-9 w-9 touch-manipulation", title: "Mudar de canal", onClick: () => ctx?.setMobileChannelsOpen(true), children: /* @__PURE__ */ jsx(Menu, { className: "h-4 w-4" }) }) }),
    /* @__PURE__ */ jsx("div", { className: `h-7 w-7 rounded-lg grid place-items-center shrink-0 shadow-sm ${chanBg}`, children: /* @__PURE__ */ jsx(ChanIcon, { className: `h-4 w-4 ${chanColor}` }) }),
    /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1 md:flex-initial", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-semibold text-sm truncate", children: channel.name }),
        isAnnouncement && /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium text-amber-500/80 uppercase tracking-wider shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded", children: "Anuncio" }),
        isRules && /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium text-rose-500/80 uppercase tracking-wider shrink-0 bg-rose-500/10 px-1.5 py-0.5 rounded", children: "Regras" }),
        isForum && /* @__PURE__ */ jsx("span", { className: "text-[10px] font-medium text-violet-500/80 uppercase tracking-wider shrink-0 bg-violet-500/10 px-1.5 py-0.5 rounded", children: "Forum" })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground/50 md:hidden truncate -mt-px", children: ctx?.server?.name }),
      channel.topic && /* @__PURE__ */ jsx("p", { className: "hidden md:flex items-center gap-1 text-xs text-muted-foreground/70 truncate max-w-md -mt-px", children: channel.topic })
    ] }),
    channel.topic && /* @__PURE__ */ jsx("span", { className: "hidden sm:flex items-center gap-1 text-xs text-muted-foreground/60 border-l border-border/40 pl-3 ml-1 truncate max-w-[200px]", children: channel.topic }),
    /* @__PURE__ */ jsxs("div", { className: "ml-auto flex items-center gap-2", children: [
      /* @__PURE__ */ jsxs(Sheet, { children: [
        /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", className: "h-8 gap-1.5 text-muted-foreground/70 hover:text-foreground text-xs lg:hidden touch-manipulation", children: [
          /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx(Circle, { className: `h-2 w-2 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}` }),
          onlineCount
        ] }) }),
        /* @__PURE__ */ jsx(SheetContent, { side: "right", className: "p-0 w-[280px] flex flex-col", children: /* @__PURE__ */ jsx(MemberList, { serverId, presence: ctx?.presence ?? /* @__PURE__ */ new Map() }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground/70", children: [
        /* @__PURE__ */ jsx(Circle, { className: `h-2 w-2 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}` }),
        /* @__PURE__ */ jsx("span", { className: "font-medium", children: onlineCount }),
        " online"
      ] })
    ] })
  ] });
  const chatArea = isVoice ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col flex-1 min-h-0 bg-gradient-to-b from-transparent to-card/10 relative", children: [
    header,
    /* @__PURE__ */ jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsx(VoiceRoom, { room: `panela-${channelId}`, channelId }) })
  ] }) : /* @__PURE__ */ jsx("div", { className: "flex flex-col flex-1 min-h-0 relative", children: /* @__PURE__ */ jsx(ChatContainer, { channelId, serverId, channelName: channel.name, channelType: channel.type, channelDescription: channel.description, canPost: canPost || false, header }) });
  return /* @__PURE__ */ jsxs("div", { className: "flex h-full", children: [
    /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0 flex flex-col", children: chatArea }),
    /* @__PURE__ */ jsx("aside", { className: "hidden lg:flex w-60 xl:w-64 shrink-0 flex-col border-l border-border/50 bg-card/20", children: /* @__PURE__ */ jsx(MemberList, { serverId, presence: ctx?.presence ?? /* @__PURE__ */ new Map() }) })
  ] });
}
export {
  ChannelView as component
};
