import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Button } from "@/components/ui/button";
import { useRealtimeSocket } from "@/hooks/useRealtime";
import { SendHorizontal, Paperclip, X, Trash2, CornerUpLeft, Loader2, ArrowDown, RefreshCcw, Slash, ShieldOff, BellOff } from "lucide-react";
import { toast } from "sonner";

type DM = {
  id: string; content: string | null; created_at: string; author_id: string;
  reply_to: string | null; edited_at: string | null;
  attachment_url: string | null; attachment_type: string | null;
};

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

function getDateLabel(date: string) {
  const d = new Date(date); const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 6);
  if (d >= weekAgo) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export const Route = createFileRoute("/app/dms/$conversationId")({
  component: DMChat,
});

function DMChat() {
  const { conversationId } = useParams({ from: "/app/dms/$conversationId" });
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversationParticipants, setConversationParticipants] = useState<any[]>([]);
  const [groupTitle, setGroupTitle] = useState("Chat privado");
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherStatus, setOtherStatus] = useState("offline");
  const [sendMode, setSendMode] = useState<"enter" | "ctrlEnter">("enter");
  const [mobileExperience, setMobileExperience] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const profilesCache = useRef<Map<string, any>>(new Map());
  const prevScrollHeight = useRef(0);
  const { socket } = useRealtimeSocket();
  const lastTypingSent = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

  const STATUS_DOT: Record<string, string> = {
    online: "bg-emerald-500", idle: "bg-yellow-500", dnd: "bg-red-500", offline: "bg-muted-foreground/30",
  };

  async function load() {
    setLoading(true);
    const authors: string[] = [];

    const { data: parts } = await supabase.rpc("get_dm_participants_single", { conv_id: conversationId });
    const participants = parts ?? [];
    setConversationParticipants(participants);
    const pIds = participants.map((p: any) => p.user_id);
    authors.push(...pIds);

    const otherParticipants = participants.filter((p: any) => p.user_id !== user?.id);
    const otherId = otherParticipants[0]?.user_id;
    if (otherParticipants.length === 1) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
        .eq("id", otherId).maybeSingle();
      if (prof) { profilesCache.current.set(prof.id, prof); setOtherProfile(prof); }
      setGroupTitle(prof?.display_name || prof?.username || "Chat privado");
    } else if (otherParticipants.length > 1) {
      const participantNames = otherParticipants.slice(0, 3).map((p: any) => profilesCache.current.get(p.user_id)?.display_name || profilesCache.current.get(p.user_id)?.username || "Usuário");
      setGroupTitle(`${participantNames.join(", ")} ${otherParticipants.length > 3 ? `+${otherParticipants.length - 3}` : ""}`.trim());
    } else {
      setGroupTitle("Chat privado");
    }

    const { data: msgs } = await supabase
      .from("dm_messages")
      .select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    const list = (msgs ?? []) as DM[];
    list.forEach((m) => knownIds.current.add(m.id));
    authors.push(...list.map((m) => m.author_id));
    if (authors.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
        .in("id", [...new Set(authors)]);
      (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
      if (otherParticipants.length > 1) {
        const participantNames = otherParticipants.slice(0, 3).map((p: any) => profilesCache.current.get(p.user_id)?.display_name || profilesCache.current.get(p.user_id)?.username || "Usuário");
        setGroupTitle(`${participantNames.join(", ")} ${otherParticipants.length > 3 ? `+${otherParticipants.length - 3}` : ""}`.trim());
      }
    }
    setMessages(list);
    setHasMore(list.length >= 100);
    setLoading(false);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));

    if (user) {
      await supabase.from("dm_participants").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", user.id);
    }
  }

  useEffect(() => {
    setMessages([]); setOtherProfile(null); setLoading(true); setHasMore(true); setReplyTo(null); knownIds.current.clear(); load();
  }, [conversationId]);

  useEffect(() => { inputRef.current?.focus(); }, [conversationId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSendMode((localStorage.getItem("panela:dmSendMode") as "enter" | "ctrlEnter") || "enter");
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

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore || !sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMore || !hasMore) return;
      setLoadingMore(true);
      const oldest = messages[0];
      if (!oldest) { setLoadingMore(false); return; }
      prevScrollHeight.current = scrollRef.current?.scrollHeight || 0;
      supabase.from("dm_messages")
        .select("*").eq("conversation_id", conversationId).lt("created_at", oldest.created_at)
        .order("created_at", { ascending: false }).limit(50)
        .then(async ({ data }) => {
          const older = (data ?? []).reverse() as DM[];
          if (older.length < 50) setHasMore(false);
          if (!older.length) { setLoadingMore(false); return; }
          older.forEach((m) => knownIds.current.add(m.id));
          const authors = [...new Set(older.map((m) => m.author_id))];
          const { data: profs } = await supabase
            .from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
            .in("id", authors);
          (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
          setMessages((prev) => [...older, ...prev]);
          setLoadingMore(false);
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight.current;
          });
        });
    }, { rootMargin: "200px" });
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, messages.length, conversationId]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`dm-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const m = payload.new as DM;
          if (knownIds.current.has(m.id) || m.author_id === user?.id) return;
          knownIds.current.add(m.id);
          if (!profilesCache.current.has(m.author_id)) {
            const { data } = await supabase.from("profiles")
              .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
              .eq("id", m.author_id).maybeSingle();
            if (data) profilesCache.current.set(m.author_id, data);
          }
          setMessages((prev) => [...prev, m]);
          requestAnimationFrame(() => {
            if (scrollRef.current) {
              const atBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 150;
              if (atBottom) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
            }
          });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((prev) => prev.map((x) => x.id === (payload.new as DM).id ? { ...x, ...(payload.new as DM) } : x)))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => { const id = (payload.old as any).id; knownIds.current.delete(id); setMessages((prev) => prev.filter((m) => m.id !== id)); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, user?.id]);

  // Socket.io (instant delivery + typing + presence)
  useEffect(() => {
    if (!user || !socket) return;
    const otherId = otherProfile?.id;

    const onConnect = () => {
      socket.emit("presence:join", { serverId: "__dm__", status: "online" });
      if (conversationId) socket.emit("dm:join", conversationId);
      if (otherId) socket.emit("presence:subscribe", [otherId, user.id]);
    };
    const onUsers = (users: { userId: string; status: string }[]) => {
      if (otherId) {
        const found = users.find((u) => u.userId === otherId);
        if (found) setOtherStatus(found.status);
      }
    };
    const onPresenceUpdate = ({ userId: uid, status }: { userId: string; status: string }) => {
      if (uid === otherId) setOtherStatus(status);
    };
    const onTypingStart = ({ userId: uid }: { userId: string }) => {
      if (uid === user.id || uid !== otherId) return;
      setOtherTyping(true);
    };
    const onTypingStop = ({ userId: uid }: { userId: string }) => {
      if (uid === otherId) setOtherTyping(false);
    };
    const onMessageNew = async (m: DM) => {
      if (knownIds.current.has(m.id) || m.author_id === user.id) return;
      knownIds.current.add(m.id);
      if (!profilesCache.current.has(m.author_id)) {
        const { data } = await supabase.from("profiles")
          .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
          .eq("id", m.author_id).maybeSingle();
        if (data) profilesCache.current.set(m.author_id, data);
      }
      setMessages((prev) => [...prev, m]);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const atBottom = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight < 150;
          if (atBottom) scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
      });
    };
    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      knownIds.current.delete(messageId);
      setMessages((prev) => prev.filter((x) => x.id !== messageId));
    };
    const onMessageUpdated = (m: DM) => {
      setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, ...m } : x));
    };

    if (socket.connected) onConnect();
    socket.on("connect", onConnect);
    socket.on("presence:users", onUsers);
    socket.on("presence:update", onPresenceUpdate);

    const typingTimeout = setInterval(() => { setOtherTyping(false); }, 4000);

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
    if (!socket) return;
    const now = Date.now(); if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    socket.emit("dm:typing:start", { conversationId, username: user?.email || "Você" });
  }

  async function send(e: React.FormEvent | React.KeyboardEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    const content = text.trim(); const reply = replyTo?.id ?? null; setText(""); setReplyTo(null);
    setSending(true);
    const { data, error } = await supabase.from("dm_messages").insert({
      conversation_id: conversationId, author_id: user.id, content, reply_to: reply,
    }).select().maybeSingle();
    if (error) { toast.error(error.message); setSending(false); return; }
    if (data) {
      const m = data as DM;
      knownIds.current.add(m.id);
      setMessages((prev) => [...prev, m]);
      if (socket) socket.emit("message:new", { conversationId, message: m });
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
    setSending(false);
  }

  async function removeMsg(m: DM) {
    if (!confirm("Apagar?")) return;
    knownIds.current.delete(m.id);
    setMessages((prev) => prev.filter((x) => x.id !== m.id));
    if (socket) socket.emit("message:deleted", { conversationId, messageId: m.id });
    await supabase.from("dm_messages").delete().eq("id", m.id);
  }

  function authorProfile(authorId: string) {
    return profilesCache.current.get(authorId) ?? null;
  }

  function getRepliedMsg(m: DM): DM | undefined {
    return m.reply_to ? messages.find((x) => x.id === m.reply_to) : undefined;
  }

  const other = otherProfile;
  const statusDot = STATUS_DOT[otherStatus] || STATUS_DOT.offline;

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <header className="h-12 border-b border-border px-4 flex items-center gap-2.5 bg-card/30 shrink-0">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          <div className="space-y-1"><div className="h-3 w-24 bg-muted rounded animate-pulse" /><div className="h-2 w-16 bg-muted rounded animate-pulse" /></div>
        </header>
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <header className="pb-3 border-b border-border bg-card/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 pt-3">
          <div className="relative shrink-0">
            <div className="flex items-center gap-[-0.4rem]">
              {conversationParticipants.filter((p) => p.user_id !== user?.id).slice(0, 3).map((participant: any, idx: number) => {
                const profile = profilesCache.current.get(participant.user_id) ?? null;
                return (
                  <Avatar key={participant.user_id} className={`h-9 w-9 ring-2 ring-card ${idx > 0 ? "-ml-3" : ""}`}>
                    <AvatarImage src={profile?.avatar_url ?? undefined} />
                    <AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                );
              })}
            </div>
            <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-card ${statusDot}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{conversationParticipants.length > 2 ? groupTitle : other?.display_name || other?.username || "Carregando..."}</p>
            <div className="text-[10px] text-muted-foreground flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 ${statusDot}`}>{conversationParticipants.length > 2 ? `${conversationParticipants.length} participantes` : otherStatus === "online" ? "Online" : otherStatus === "idle" ? "Ausente" : otherStatus === "dnd" ? "Ocupado" : "Offline"}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground/70">{conversationParticipants.length > 2 ? "Grupo" : "Mensagem direta"}</span>
            </div>
          </div>
        </div>
        <div className="mt-3 px-4 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setIsMuted((current) => !current)}>
            <Bell className="h-4 w-4" /> {isMuted ? "Desativar som" : "Silenciar"}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => load()}>
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setMobileExperience((prev) => !prev)}>
            <Slash className="h-4 w-4" /> {mobileExperience ? "Modo móvel" : "Experiência touch"}
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setCompactMode((prev) => !prev)}>
            <ShieldOff className="h-4 w-4" /> {compactMode ? "Compacto" : "Expandir"}
          </Button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3 space-y-1 scroll-smooth">
        {hasMore && <div ref={sentinelRef} className="h-3" />}
        {loadingMore && (
          <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" /></div>
        )}

        {messages.length === 0 && !loadingMore && (
          <div className="text-center text-muted-foreground py-12">
            <div className="h-14 w-14 rounded-full bg-primary/10 grid place-items-center mx-auto mb-3">
              <Avatar className="h-10 w-10"><AvatarImage src={other?.avatar_url ?? undefined} /><AvatarFallback>{other?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback></Avatar>
            </div>
            <p className="font-medium">Início da conversa</p>
            <p className="text-sm">Mande uma mensagem para {other?.display_name || other?.username || "seu contato"}!</p>
          </div>
        )}

        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const showDateSep = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
          const isMine = m.author_id === user?.id;
          const profile = authorProfile(m.author_id);
          const replied = getRepliedMsg(m);
          const repliedProfile = replied ? authorProfile(replied.author_id) : null;
          const sameAuthor = prev && prev.author_id === m.author_id && !m.reply_to && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 300_000);
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
              <div className={`group flex gap-2.5 ${isMine ? "flex-row-reverse" : ""} ${sameAuthor ? "mt-0.5" : "mt-2"}`}>
                {!sameAuthor ? (
                  <Link to="/app/u/$slug" params={{ slug: m.author_id }} className="shrink-0">
                    <Avatar className="h-8 w-8 mt-0.5">
                      <AvatarImage src={profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                    </Avatar>
                  </Link>
                ) : <div className="w-8 shrink-0" />}
                <div className={`min-w-0 flex flex-col ${compactMode ? "max-w-[85%]" : "max-w-[75%]"} ${isMine ? "items-end" : ""}`}>
                  {!isMine && !sameAuthor && profile && (
                    <Link to="/app/u/$slug" params={{ slug: m.author_id }}
                      className="text-xs font-medium mb-0.5 ml-1 hover:underline">
                      <UsernameBadge profile={profile} />
                    </Link>
                  )}
                  {replied && (
                    <div className={`text-[11px] flex items-center gap-1.5 mb-0.5 px-3 py-1 rounded-lg max-w-[280px] truncate ${
                      isMine ? "bg-primary/20" : "bg-accent/60"
                    }`}>
                      <CornerUpLeft className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                      <Avatar className="h-4 w-4"><AvatarImage src={repliedProfile?.avatar_url} /><AvatarFallback className="text-[7px]">{repliedProfile?.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
                      <span className="truncate text-muted-foreground/80">{replied.content}</span>
                    </div>
                  )}
                  <div className={`rounded-2xl text-sm ${compactMode ? "px-3 py-2" : "px-3.5 py-2.5"} ${
                    isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-accent rounded-bl-md"
                  }`}>
                    {m.content && (
                      <div className="prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-a:text-inherit prose-img:rounded-lg">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                      </div>
                    )}
                    {m.edited_at && <span className="text-[10px] opacity-60">(editado)</span>}
                    {m.attachment_url && (
                      <div className="mt-1.5">
                        {m.attachment_type?.startsWith("image/") ? (
                          <img src={m.attachment_url} alt="attachment" className="max-h-48 rounded-lg object-contain" />
                        ) : m.attachment_type?.startsWith("video/") ? (
                          <video src={m.attachment_url} controls className="max-h-48 rounded-lg" />
                        ) : (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs underline opacity-80 hover:opacity-100">
                            <Paperclip className="h-3 w-3" />{m.attachment_url.split("/").pop()}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 px-1">
                    <p className="text-[10px] text-muted-foreground" title={new Date(m.created_at).toLocaleString("pt-BR")}>
                      {relativeTime(m.created_at)}
                    </p>
                    {isMine && (
                      <button onClick={() => removeMsg(m)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/50 hover:text-destructive transition-all">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                {!isMine && (
                  <button onClick={() => setReplyTo(m)}
                    className="opacity-0 group-hover:opacity-100 self-center p-1 text-muted-foreground/40 hover:text-foreground transition-opacity shrink-0">
                    <CornerUpLeft className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <div className="w-8 shrink-0" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <span className="flex gap-0.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "200ms" }} />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "400ms" }} />
              </span>
              {other?.display_name || other?.username || "Alguém"} está digitando…
            </div>
          </div>
        )}
      </div>

      {mobileExperience && (
        <div className="md:hidden sticky bottom-0 left-0 right-0 z-20 border-t border-border bg-background/90 backdrop-blur-sm px-3 py-3">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-2xl border border-border bg-accent/70 py-3 text-[12px] font-medium text-foreground hover:bg-accent transition">
              <Paperclip className="mx-auto mb-1 h-4 w-4" /> Anexar
            </button>
            <button type="button" onClick={() => setReplyTo(messages[messages.length - 1] ?? null)} className="rounded-2xl border border-border bg-accent/70 py-3 text-[12px] font-medium text-foreground hover:bg-accent transition">
              <CornerUpLeft className="mx-auto mb-1 h-4 w-4" /> Responder
            </button>
            <button type="button" onClick={() => scrollToBottom()} className="rounded-2xl border border-border bg-primary text-primary-foreground py-3 text-[12px] font-medium hover:bg-primary/90 transition">
              <ArrowDown className="mx-auto mb-1 h-4 w-4" /> Baixar
            </button>
          </div>
        </div>
      )}

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button onClick={() => scrollToBottom()}
          className="absolute bottom-20 right-6 h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 grid place-items-center hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2 z-10">
          <ArrowDown className="h-5 w-5 text-primary-foreground" />
        </button>
      )}

      <form onSubmit={send} className="p-2 sm:p-3 border-t border-border bg-card/40 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0">
        {replyTo && (
          <div className="mb-1.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/50 border border-border text-xs">
            <CornerUpLeft className="h-3 w-3 shrink-0 text-muted-foreground/60" />
            <Avatar className="h-5 w-5"><AvatarImage src={authorProfile(replyTo.author_id)?.avatar_url} /><AvatarFallback className="text-[8px]">{(authorProfile(replyTo.author_id)?.username || "?")[0]?.toUpperCase()}</AvatarFallback></Avatar>
            <span className="truncate text-muted-foreground/70">{replyTo.content}</span>
            <button type="button" onClick={() => setReplyTo(null)} className="ml-auto p-0.5 text-muted-foreground/50 hover:text-foreground shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-background rounded-xl border border-border px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-sm focus-within:border-primary/40 transition-all">
          <input type="file" ref={fileRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, conversationId); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="text-muted-foreground/50 hover:text-foreground p-1.5 shrink-0 transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          <Textarea
            ref={inputRef}
            value={text}
            onChange={(e) => { setText(e.target.value); emitTyping(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && sendMode === "enter") {
                e.preventDefault(); send(e);
              }
              if (e.key === "Enter" && e.ctrlKey && sendMode === "ctrlEnter") {
                e.preventDefault(); send(e);
              }
            }}
            placeholder="Mensagem..."
            rows={2}
            className={`bg-transparent border-0 resize-none flex-1 min-w-0 px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm ${compactMode ? "py-2" : "py-3"}`} 
            maxLength={2000}
          />
          <button type="submit" disabled={!text.trim() || sending}
            className="text-primary/60 hover:text-primary disabled:opacity-25 p-1.5 shrink-0 transition-colors disabled:cursor-not-allowed">
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{sendMode === "enter" ? "Enter para enviar, Shift + Enter para nova linha." : "Ctrl + Enter para enviar, Shift + Enter para nova linha."}</span>
          <span>{mobileExperience ? "Modo móvel ativado: controles maiores e toque facilitado." : "Toque para ativar controles móveis em configurações."}</span>
        </div>
      </form>
    </div>
  );
}

async function uploadFile(file: File, conversationId: string) {
  try {
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversation_id", conversationId);
    const res = await fetch(`${apiUrl}/api/upload-dm`, {
      method: "POST",
      headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
      body: formData,
    });
    if (!res.ok) return toast.error("Upload falhou");
  } catch { toast.error("Erro no upload"); }
}
