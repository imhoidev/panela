import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeSocket } from "@/hooks/useRealtime";
import { useChat } from "@/hooks/useChat";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { VoiceRoom } from "@/components/VoiceRoom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { GifPicker } from "@/components/GifPicker";
import { StickerPicker } from "@/components/StickerPicker";
import { ReportDialog } from "@/components/ModPanel";
import { MemberList } from "@/components/MemberList";

import { toast } from "sonner";
import { useServerContext } from "./$serverId";
import {
  Hash, SendHorizontal, Smile, CornerUpLeft, X, Trash2, Pencil, Check, Volume2, ArrowLeft,
  Paperclip, MessageSquare, Users, Circle, AtSign, Menu, ArrowDown,
  ScrollText, MessageSquareText, Shield,
} from "lucide-react";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "🥹", "🤝", "👀", "🎉", "💯", "🍳"];

type Msg = {
  id: string; content: string | null; created_at: string; author_id: string; channel_id: string;
  reply_to: string | null; edited_at: string | null; thread_root: string | null;
  attachment_url: string | null; attachment_type: string | null;
  author?: { username: string; display_name: string | null; avatar_url: string | null; name_color: string | null; name_colors: any; name_effect: string | null; current_plan: string } | null;
};
type Reaction = { id: string; message_id: string; emoji: string; user_id: string };

export const Route = createFileRoute("/app/servers/$serverId/$channelId")({
  component: ChannelView,
});

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 5000) return "agora";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 172800000) return "ontem";
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatTime(date: string) {
  return new Date(date).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getDateLabel(date: string) {
  const d = new Date(date); const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 6);
  if (d >= weekAgo) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function getNextLevel(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 10));
  return { level, nextXp: (level + 1) ** 2 * 10, progress: (xp % ((level + 1) ** 2 * 10 - level ** 2 * 10)) / ((level + 1) ** 2 * 10 - level ** 2 * 10) };
}

function ChannelView() {
  const { serverId, channelId } = useParams({ from: "/app/servers/$serverId/$channelId" });
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [channel, setChannel] = useState<any>(null);
  const { messages, hasMore, fetchMore, sendMessage, editMessage, deleteMessage } = useChat(channelId);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [typing, setTyping] = useState<Record<string, { name: string; t: number }>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const profilesCache = useRef<Map<string, Msg["author"]>>(new Map());
  const memberRolesCache = useRef<Map<string, { name: string; color: string | null; gif_tag_url: string | null }[]>>(new Map());
  const typingChan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { socket } = useRealtimeSocket();
  const lastTypingSent = useRef(0);
  const prevScrollHeight = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  async function fetchProfile(uid: string): Promise<Msg["author"]> {
    if (profilesCache.current.has(uid)) return profilesCache.current.get(uid)!;
    const { data } = await supabase.from("profiles").select("username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", uid).maybeSingle();
    if (data) profilesCache.current.set(uid, data as any);
    return (data as any) ?? null;
  }

  async function loadRoles() {
    const { data: allRoles } = await supabase.from("server_roles").select("id, name, color, gif_tag_url").eq("server_id", serverId);
    const rolesMap = new Map((allRoles ?? []).map((r: any) => [r.id, r]));
    const { data: memRoles } = await supabase.from("server_member_roles")
      .select("member_id, role_id, server_members!inner(user_id)");
    const userRoles = new Map<string, any[]>();
    (memRoles ?? []).forEach((mr: any) => {
      const uid = mr.server_members?.user_id;
      if (!uid) return;
      const role = rolesMap.get(mr.role_id);
      if (!role) return;
      const list = userRoles.get(uid) ?? [];
      list.push(role);
      userRoles.set(uid, list);
    });
    memberRolesCache.current = userRoles;
  }

  function appendMessageToCache(message: Msg) {
    qc.setQueryData(["chatMessages", channelId], (old: any) => {
      if (!old?.pages) return old;
      const pages = old.pages.slice();
      if (!pages.length) {
        pages.push({ messages: [message], nextCursor: null });
      } else {
        pages[0] = { ...pages[0], messages: [...pages[0].messages, message] };
      }
      return { ...old, pages };
    });
  }

  function updateMessageInCache(message: Msg) {
    qc.setQueryData(["chatMessages", channelId], (old: any) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((m: Msg) => m.id === message.id ? { ...m, ...message } : m),
        })),
      };
    });
  }

  function removeMessageFromCache(messageId: string) {
    qc.setQueryData(["chatMessages", channelId], (old: any) => {
      if (!old?.pages?.length) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter((m: Msg) => m.id !== messageId),
        })),
      };
    });
  }

  useEffect(() => { inputRef.current?.focus(); }, [channelId]);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMore || !hasMore) return;
      setLoadingMore(true);
      prevScrollHeight.current = scrollRef.current?.scrollHeight || 0;
      fetchMore().finally(() => setLoadingMore(false));
    }, { rootMargin: "200px" });
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, fetchMore, channelId]);

  useEffect(() => {
    let active = true;
    async function loadChannel() {
      const { data } = await supabase.from("channels").select("*").eq("id", channelId).maybeSingle();
      if (!active) return;
      setChannel(data);
    }
    loadChannel();
    return () => { active = false; };
  }, [channelId]);

  useEffect(() => { inputRef.current?.focus(); }, [channelId]);

  useEffect(() => { setReactions([]); setReplyTo(null); setEditing(null); loadRoles(); }, [channelId]);

  useEffect(() => {
    if (!messages.length) { setReactions([]); return; }
    let active = true;
    const ids = messages.map((m) => m.id);
    supabase.from("message_reactions").select("*").in("message_id", ids).then(({ data }) => {
      if (!active) return;
      setReactions((data ?? []) as Reaction[]);
    });
    return () => { active = false; };
  }, [channelId, messages.length]);

  // Realtime subscription (backup — socket.io is primary)
  useEffect(() => {
    if (!channel || channel.type === "voice") return;
    const ch = supabase.channel(`channel-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Msg;
          if (m.thread_root || knownIds.current.has(m.id)) return;
          knownIds.current.add(m.id);
          m.author = await fetchProfile(m.author_id);
          appendMessageToCache(m);
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              const atBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 150;
              if (atBottom) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }
          });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Msg;
          m.author = await fetchProfile(m.author_id);
          updateMessageInCache(m);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => { const id = (payload.old as any).id; knownIds.current.delete(id); removeMessageFromCache(id); })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          if (payload.eventType === "INSERT") setReactions((p) => [...p, payload.new as Reaction]);
          else if (payload.eventType === "DELETE") setReactions((p) => p.filter((r) => r.id !== (payload.old as any).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, channel?.type]);

  useEffect(() => {
    if (!socket || !channel || channel.type === "voice") return;

    const onConnect = () => {
      socket.emit("channel:join", channelId);
    };
    const onMessageNew = async (m: Msg) => {
      if (knownIds.current.has(m.id) || m.thread_root) return;
      knownIds.current.add(m.id);
      m.author = await fetchProfile(m.author_id);
      appendMessageToCache(m);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const atBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 150;
          if (atBottom) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
      });
    };
    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      knownIds.current.delete(messageId);
      removeMessageFromCache(messageId);
    };
    const onMessageUpdated = async (m: Msg) => {
      m.author = await fetchProfile(m.author_id);
      updateMessageInCache(m);
    };
    const onTypingStart = ({ userId: uid, username }: { userId: string; username: string }) => {
      if (uid === user?.id) return;
      setTyping((prev) => ({ ...prev, [uid]: { name: username, t: Date.now() } }));
    };
    const onTypingStop = ({ userId: uid }: { userId: string }) => {
      setTyping((prev) => { const next: typeof prev = {}; Object.entries(prev).forEach(([key, value]) => { if (key !== uid && Date.now() - value.t < 4000) next[key] = value; }); return next; });
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
  }, [socket, channelId, channel?.type, user?.id]);

  // Typing via Supabase Realtime broadcast
  useEffect(() => {
    if (!user || !channel || channel.type === "voice") return;
    const ch = supabase.channel(`typing:${channelId}`);
    ch.on("broadcast", { event: "typing" }, ({ payload }: { payload: { userId: string; username: string } }) => {
      if (payload.userId === user.id) return;
      setTyping((prev) => ({ ...prev, [payload.userId]: { name: payload.username, t: Date.now() } }));
    });
    ch.subscribe();
    typingChan.current = ch;
    const interval = setInterval(() => {
      setTyping((prev) => { const now = Date.now(); const next: typeof prev = {}; for (const [k, v] of Object.entries(prev)) if (now - v.t < 4000) next[k] = v; return next; });
    }, 1000);
    return () => { clearInterval(interval); supabase.removeChannel(ch); typingChan.current = null; };
  }, [user?.id, channelId, channel?.type]);

  // Scroll detection
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      clearTimeout(scrollTimeout.current);
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      setShowScrollBtn(!atBottom && messages.length > 0);
      scrollTimeout.current = setTimeout(() => {}, 100);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  function scrollToBottom(smooth = true) {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? "smooth" : "instant" });
    setShowScrollBtn(false);
  }

  function emitTyping() {
    const now = Date.now(); if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    if (socket) {
      socket.emit("typing:start", { channelId, username: profile?.display_name || profile?.username });
      return;
    }
    typingChan.current?.send({ type: "broadcast", event: "typing", payload: { userId: user!.id, username: profile?.display_name || profile?.username } });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    const content = text.trim(); const reply = replyTo?.id ?? null; setText(""); setReplyTo(null);
    setSending(true);
    try {
      const message = await sendMessage.mutateAsync({ content, reply_to: reply });
      if (message) {
        knownIds.current.add(message.id);
        if (socket) socket.emit("message:new", { channelId, message });
        requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
      }
    } catch (_err) {
      // erro tratado pelo hook
    } finally {
      setSending(false);
    }
  }

  async function react(msg: Msg, emoji: string) {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === msg.id && r.emoji === emoji && r.user_id === user.id);
    if (mine) { await supabase.from("message_reactions").delete().eq("id", mine.id); }
    else { await supabase.from("message_reactions").insert({ message_id: msg.id, emoji, user_id: user.id }); }
  }

  async function removeMsg(m: Msg) {
    if (!confirm("Apagar essa mensagem?")) return;
    knownIds.current.delete(m.id);
    if (socket) socket.emit("message:deleted", { channelId, messageId: m.id });
    try {
      await deleteMessage.mutateAsync(m.id);
    } catch (_err) {
      // erro tratado pelo hook
    }
  }

  async function saveEdit() {
    if (!editing) return;
    const c = editText.trim(); if (!c) return;
    try {
      await editMessage.mutateAsync({ id: editing.id, content: c });
      if (socket) socket.emit("message:updated", { channelId, message: { id: editing.id, content: c, edited_at: new Date().toISOString(), author_id: editing.author_id, channel_id: editing.channel_id, reply_to: editing.reply_to, thread_root: editing.thread_root, created_at: editing.created_at, attachment_url: editing.attachment_url, attachment_type: editing.attachment_type } });
      setEditing(null);
    } catch (_err) {
      // erro tratado pelo hook
    }
  }

  async function uploadFile(file: File) {
    if (!user || uploading) return; setUploading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ""; const formData = new FormData(); formData.append("file", file); formData.append("channel_id", channelId);
      const res = await fetch(`${apiUrl}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` }, body: formData, });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload falhou"); }
      const { url } = await res.json(); setText((prev) => prev + ` ${url} `); toast.success("Arquivo anexado");
    } catch (err: any) { toast.error(err.message); } finally { setUploading(false); }
  }

  function insertGif(url: string) { setText((prev) => prev + ` ![gif](${url}) `); }
  function insertSticker(url: string) { setText((prev) => prev + ` ![sticker](${url}) `); }

  const ctx = useServerContext();
  if (!channel) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8">Carregando canal…</div>;

  const isVoice = channel.type === "voice";
  const isRules = channel.type === "rules";
  const isAnnouncement = channel.type === "announcement";
  const isForum = channel.type === "forum";
  const canPost = ctx?.canManage || ctx?.memberLevel >= 60 || (!isRules && !isAnnouncement);
  const onlineCount = Array.from((ctx?.presence ?? new Map()).values()).filter((s) => s !== "offline").length;

  function channelMeta(type: string) {
    switch (type) {
      case "voice": return { icon: Volume2, color: "text-emerald-500", label: "Canal de voz" };
      case "announcement": return { icon: MessageSquare, color: "text-amber-500", label: "Anuncios" };
      case "rules": return { icon: ScrollText, color: "text-rose-500", label: "Regras" };
      case "forum": return { icon: MessageSquareText, color: "text-violet-500", label: "Forum" };
      default: return { icon: Hash, color: "text-primary/70", label: "Canal de texto" };
    }
  }
  const { icon: ChanIcon, color: chanColor, label: chanLabel } = channelMeta(channel.type);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-transparent to-card/10 relative">
      {/* ─── Channel Header ─── */}
      <header className="h-12 border-b border-border/80 px-3 sm:px-5 flex items-center gap-2.5 bg-card/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-1 md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Mudar de canal" onClick={() => ctx?.setMobileChannelsOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>
        </div>
        <div className={`h-7 w-7 rounded-lg grid place-items-center shrink-0 ${isVoice ? "bg-emerald-500/15" : isRules ? "bg-rose-500/15" : isForum ? "bg-violet-500/15" : "bg-primary/10"}`}>
          <ChanIcon className={`h-4 w-4 ${chanColor}`} />
        </div>
        <div className="min-w-0 flex-1 md:flex-initial">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm truncate">{channel.name}</h2>
            {isAnnouncement && <span className="text-[10px] font-medium text-amber-500/80 uppercase tracking-wider shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded">Anuncio</span>}
            {isRules && <span className="text-[10px] font-medium text-rose-500/80 uppercase tracking-wider shrink-0 bg-rose-500/10 px-1.5 py-0.5 rounded">Regras</span>}
            {isForum && <span className="text-[10px] font-medium text-violet-500/80 uppercase tracking-wider shrink-0 bg-violet-500/10 px-1.5 py-0.5 rounded">Forum</span>}
          </div>
          <p className="text-[10px] text-muted-foreground/50 md:hidden truncate -mt-px">{ctx?.server?.name}</p>
          {channel.topic && (
            <p className="hidden md:flex items-center gap-1 text-xs text-muted-foreground/70 truncate max-w-md -mt-px">
              <AtSign className="h-3 w-3 shrink-0" />{channel.topic}
            </p>
          )}
        </div>
        {channel.topic && (
          <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/70 border-l border-border/60 pl-3 ml-1 truncate max-w-[200px]">
            <AtSign className="h-3 w-3 shrink-0" />{channel.topic}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground/70 hover:text-foreground text-xs md:hidden">
                <Users className="h-3.5 w-3.5" />
                <Circle className={`h-2 w-2 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}`} />
                {onlineCount}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[280px]">
              <MemberList serverId={serverId} presence={ctx?.presence ?? new Map()} />
            </SheetContent>
          </Sheet>
          <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Circle className={`h-2 w-2 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}`} />
            <span className="font-medium">{onlineCount}</span> online
          </div>
        </div>
      </header>

      {isVoice ? (
        <div className="flex-1 min-h-0">
          <VoiceRoom room={`panela-${channelId}`} channelId={channelId} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-auto px-2 sm:px-5 py-2 space-y-0.5 scroll-smooth relative">
            {hasMore && <div ref={sentinelRef} className="h-3" />}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground/60">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}

            {messages.length === 0 && !loadingMore && !isRules && !isForum && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-6 py-16">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 grid place-items-center mb-4">
                  <ChanIcon className={`h-8 w-8 ${chanColor}/60`} />
                </div>
                <p className="font-semibold text-foreground/80">Bem-vindo a <span className="text-primary">#{channel.name}</span></p>
                <p className="text-sm mt-1">{isAnnouncement ? "Anuncios importantes serao publicados aqui." : "Esse e o comeco do canal. Mande a primeira mensagem!"}</p>
              </div>
            )}

            {isRules && (
              <div className="px-4 py-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border/40">
                  <ScrollText className="h-8 w-8 text-rose-500" />
                  <div>
                    <h2 className="font-semibold text-lg">Regras do servidor</h2>
                    <p className="text-xs text-muted-foreground/60">{ctx?.server?.name || "Servidor"}</p>
                  </div>
                </div>
                {channel.description ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground/90">
                    {channel.description}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">Nenhuma regra definida ainda.</p>
                )}
                {messages.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 pt-2">
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider">Discussoes</span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                    <p className="text-xs text-muted-foreground/50">Conversas sobre as regras aparecem abaixo.</p>
                  </>
                )}
              </div>
            )}

            {isForum && messages.length === 0 && !loadingMore && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-6 py-16">
                <MessageSquareText className="h-10 w-10 text-violet-500/50 mb-3" />
                <p className="font-semibold text-foreground/80">Forum #{channel.name}</p>
                <p className="text-sm mt-1">Crie uma thread para iniciar uma discussao.</p>
              </div>
            )}

            {isForum && messages.length > 0 && (
              <div className="px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 pb-2 border-b border-border/40 mb-2">
                  <MessageSquareText className="h-5 w-5 text-violet-500" />
                  <h2 className="font-semibold text-sm">Topicos do forum</h2>
                  <span className="text-[11px] text-muted-foreground/50 ml-auto">{messages.filter((m) => !m.reply_to).length} topicos</span>
                </div>
                {messages.filter((m) => !m.reply_to).map((m) => (
                  <div key={m.id} className="flex items-start gap-3 rounded-lg border border-border/60 p-3 hover:bg-accent/15 transition-colors cursor-pointer"
                    onClick={() => navigate({ to: "/app/servers/$serverId/threads/$messageId", params: { serverId, channelId, messageId: m.id } })}>
                    <div className="h-8 w-8 rounded-full bg-violet-500/10 grid place-items-center shrink-0">
                      <MessageSquareText className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.content?.slice(0, 80)}{m.content && m.content.length > 80 ? "..." : ""}</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                        {m.author?.display_name || m.author?.username || "Alguem"} &middot; {formatTime(m.created_at)}
                      </p>
                    </div>
                    {m.thread_root && (
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">
                        {messages.filter((r) => r.thread_root === m.id).length} respostas
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isForum && messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDateSep = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
              const sameAuthor = prev && prev.author_id === m.author_id && !m.reply_to && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
              const replied = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null;
              const myRx = reactionsGrouped(reactions, m.id);
              return (
                <div key={m.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border/40" />
                      <span className="text-[11px] font-semibold text-muted-foreground/50 uppercase tracking-wider shrink-0">
                        {getDateLabel(m.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-border/40" />
                    </div>
                  )}
                    <MessageBubble
                    m={m} sameAuthor={sameAuthor} replied={replied} myRx={myRx}
                    editing={editing} editText={editText} setEditText={setEditText}
                    setEditing={setEditing} saveEdit={saveEdit}
                    react={react} setReplyTo={setReplyTo} removeMsg={removeMsg}
                    user={user} serverId={serverId} navigate={navigate}
                    channelId={channelId} relativeTime={relativeTime} formatTime={formatTime}
                    roleCache={memberRolesCache.current}
                  />
                </div>
              );
            })}

            {Object.values(typing).length > 0 && (
              <div className="px-3 py-1.5 flex items-center gap-2 text-xs text-muted-foreground/60 italic">
                <span className="flex gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "200ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "400ms" }} />
                </span>
                {Object.values(typing).map((t) => t.name).join(", ")} digitando…
              </div>
            )}
          </div>

          {/* Scroll to bottom button */}
          {showScrollBtn && (
            <button onClick={() => scrollToBottom()}
              className="absolute bottom-20 right-6 h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 grid place-items-center hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2 z-10">
              <ArrowDown className="h-5 w-5 text-primary-foreground" />
            </button>
          )}

          {isRules || isAnnouncement ? (
            <div className="px-2 sm:px-5 pb-2 sm:pb-3 pt-1 border-t border-border/50 bg-card/10 shrink-0">
              {canPost ? (
                <form onSubmit={send}>
                  <Input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => { setText(e.target.value); emitTyping(); }}
                    placeholder={`Mensagem em #${channel.name}`}
                    className="bg-card/80 backdrop-blur rounded-xl border border-border/70 h-10 px-3 text-sm placeholder:text-muted-foreground/40 focus-visible:border-primary/40"
                    maxLength={2000}
                  />
                </form>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card/50 border border-border/50 text-xs text-muted-foreground/60">
                  <Shield className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  <span>{isAnnouncement ? "Apenas moderadores podem publicar anuncios." : "Apenas moderadores podem comentar sobre as regras."}</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={send} className="px-2 sm:px-5 pb-2 sm:pb-3 pt-1 border-t border-border/50 bg-card/10 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0">
              {replyTo && (
                <div className="mb-1.5 text-xs flex items-center justify-between px-3 py-1.5 rounded-lg bg-accent/20 border border-border/60">
                  <span className="truncate flex items-center gap-1.5">
                    <CornerUpLeft className="inline h-3 w-3 shrink-0 text-primary/60" />
                    <span className="text-muted-foreground/70">respondendo</span>
                    <span className="font-medium text-foreground/80">@{replyTo.author?.username ?? "alguem"}</span>
                    <span className="text-muted-foreground/50 hidden sm:inline truncate">: {replyTo.content}</span>
                  </span>
                  <button type="button" onClick={() => setReplyTo(null)} className="p-1 hover:text-foreground text-muted-foreground/50 transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-card/80 backdrop-blur rounded-xl border border-border/70 px-2 py-1.5 shadow-sm shadow-black/10 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <input type="file" ref={fileRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
                <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30 p-1.5 shrink-0 transition-colors" title="Anexar arquivo">
                  <Paperclip className="h-5 w-5" />
                </button>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground/50 hover:text-foreground text-xs font-bold px-2 h-8 shrink-0 transition-colors">GIF</button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-auto p-2" align="start">
                    <GifPicker onSelect={insertGif} />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" className="text-muted-foreground/50 hover:text-foreground p-1.5 shrink-0 transition-colors">
                      <Smile className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent side="top" className="w-auto p-2" align="start">
                    <StickerPicker onSelect={insertSticker} serverId={serverId} />
                  </PopoverContent>
                </Popover>
                <Input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => { setText(e.target.value); emitTyping(); }}
                  placeholder={`Mensagem em #${channel.name}`}
                  className="bg-transparent border-0 h-10 flex-1 min-w-0 px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/40"
                  maxLength={2000}
                />
                <button type="submit" disabled={!text.trim() || sending}
                  className="text-primary/60 hover:text-primary disabled:opacity-25 p-1.5 shrink-0 transition-colors disabled:cursor-not-allowed"
                  title="Enviar">
                  <SendHorizontal className="h-5 w-5" />
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}

function MessageBubble({
  m, sameAuthor, replied, myRx, editing, editText, setEditText,
  setEditing, saveEdit, react, setReplyTo, removeMsg, user, serverId, navigate, channelId, relativeTime, formatTime, roleCache,
}: any) {
  return (
    <div className={`group relative flex gap-2.5 px-2 py-1 rounded-lg hover:bg-accent/15 transition-colors ${sameAuthor ? "pl-[3.25rem]" : ""}`}>
      {!sameAuthor ? (
        <Link to="/app/u/$slug" params={{ slug: m.author_id }}
          className="h-9 w-9 mt-0.5 shrink-0 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary/40 transition-all">
          <Avatar className="h-full w-full">
            <AvatarImage src={m.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{(m.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
      ) : <div className="w-9 shrink-0" />}

      <div className="min-w-0 flex-1">
        {replied && (
          <div className="text-xs text-muted-foreground/60 flex items-center gap-1 mb-0.5 truncate border-l-2 border-primary/30 pl-2">
            <CornerUpLeft className="h-3 w-3 shrink-0" />
            <span className="font-medium text-foreground/60">@{replied.author?.username ?? "alguém"}</span>
            <span className="truncate opacity-70">{replied.content}</span>
          </div>
        )}
        {!sameAuthor && (
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {m.author ? <UsernameBadge profile={m.author as any} /> : <span className="text-sm text-muted-foreground">…</span>}
              {(() => {
              const roles = roleCache.get(m.author_id) ?? [];
              const top = roles.sort((a, b) => (b as any).level - (a as any).level)?.[0];
              if (!top) return null;
              if (top.gif_tag_url) return <img src={top.gif_tag_url} alt="" className="h-4 w-4 rounded-sm object-cover shrink-0" title={top.name} />;
              return (
                <span className="text-[10px] font-medium leading-none px-1 py-0.5 rounded shrink-0"
                  style={{ color: top.color || undefined, backgroundColor: top.color ? `${top.color}22` : undefined }}>
                  {top.name}
                </span>
              );
            })()}
            <span className="text-[10px] text-muted-foreground/50" title={new Date(m.created_at).toLocaleString("pt-BR")}>
              {relativeTime(m.created_at)}
            </span>
          </div>
        )}

        {editing?.id === m.id ? (
          <div className="flex gap-2 items-center mt-1">
            <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter") saveEdit(); }} className="h-9 text-sm" />
            <Button size="icon" onClick={saveEdit} className="h-8 w-8"><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(null)} className="h-8 w-8"><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="mt-0.5">
            {m.content && (
              <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1 prose-pre:bg-muted prose-code:text-primary/80 prose-a:text-primary prose-img:rounded-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            )}
            {m.edited_at && <span className="text-[10px] text-muted-foreground/40 ml-1">(editado)</span>}
            {m.attachment_url && (
              <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-2.5 rounded-lg border border-border/60 bg-accent/20 px-3 py-2 text-sm hover:bg-accent/40 transition-colors">
                {m.attachment_type?.startsWith("image/") ? (
                  <img src={m.attachment_url} alt="attachment" className="max-h-48 rounded object-contain" />
                ) : m.attachment_type?.startsWith("video/") ? (
                  <video src={m.attachment_url} controls className="max-h-48 rounded" />
                ) : m.attachment_type?.startsWith("audio/") ? (
                  <audio src={m.attachment_url} controls className="max-w-full" />
                ) : (
                  <><Paperclip className="h-4 w-4 text-muted-foreground" /><span className="truncate text-muted-foreground">{m.attachment_url.split("/").pop()}</span></>
                )}
              </a>
            )}
          </div>
        )}

        {myRx.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {myRx.map(([emoji, list]: [string, any[]]) => {
              const mine = list.some((r) => r.user_id === user?.id);
              return (
                <button key={emoji} onClick={() => react(m, emoji)}
                  className={`text-xs rounded-full border px-1.5 py-0.5 flex items-center gap-1 transition-all ${
                    mine ? "bg-primary/15 border-primary/30 text-primary shadow-sm" : "bg-accent/30 border-border/60 text-muted-foreground hover:bg-accent/60"
                  }`}>
                  <span>{emoji}</span><span className="text-[10px] font-medium">{list.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="message-toolbar opacity-0 group-hover:opacity-100 transition-opacity">
        <Popover>
          <PopoverTrigger asChild>
            <button><Smile className="h-4 w-4" /></button>
          </PopoverTrigger>
          <PopoverContent className="p-1 w-auto" side="top" align="start">
            <div className="flex gap-0.5">
              {EMOJIS.map((e) => (
                <button key={e} onClick={() => react(m, e)} className="text-lg hover:bg-accent rounded p-1.5 sm:p-1 transition-colors">{e}</button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button onClick={() => setReplyTo(m)} title="Responder"><CornerUpLeft className="h-4 w-4" /></button>
        <button onClick={() => navigate({ to: "/app/servers/$serverId/threads/$messageId", params: { serverId, messageId: m.id } })} title="Thread">
          <MessageSquare className="h-4 w-4" />
        </button>
        {m.author_id === user?.id && (
          <>
            <button onClick={() => { setEditing(m); setEditText(m.content ?? ""); }} title="Editar"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => removeMsg(m)} title="Apagar" className="!text-destructive/70 hover:!text-destructive"><Trash2 className="h-4 w-4" /></button>
          </>
        )}
        <ReportDialog messageId={m.id} channelId={channelId} />
      </div>
    </div>
  );
}

function reactionsGrouped(all: Reaction[], msgId: string): Array<[string, Reaction[]]> {
  const map = new Map<string, Reaction[]>();
  for (const r of all) { if (r.message_id !== msgId) continue; const arr = map.get(r.emoji) ?? []; arr.push(r); map.set(r.emoji, arr); }
  return Array.from(map.entries());
}


