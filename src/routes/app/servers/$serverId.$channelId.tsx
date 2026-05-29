import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import {
  Hash, SendHorizontal, Smile, CornerUpLeft, X, Trash2, Pencil, Check, Volume2, ArrowLeft,
  Paperclip, MessageSquare, Users,
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

function ChannelView() {
  const { serverId, channelId } = useParams({ from: "/app/servers/$serverId/$channelId" });
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [channel, setChannel] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [typing, setTyping] = useState<Record<string, { name: string; t: number }>>({});
  const [presence, setPresence] = useState<Map<string, string>>(new Map());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [editText, setEditText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const profilesCache = useRef<Map<string, Msg["author"]>>(new Map());
  const typingChan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sockRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const lastTypingSent = useRef(0);
  const prevScrollHeight = useRef(0);

  async function fetchProfile(uid: string): Promise<Msg["author"]> {
    if (profilesCache.current.has(uid)) return profilesCache.current.get(uid)!;
    const { data } = await supabase.from("profiles").select("username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", uid).maybeSingle();
    if (data) profilesCache.current.set(uid, data as any);
    return (data as any) ?? null;
  }

  async function load() {
    const { data: c } = await supabase.from("channels").select("*").eq("id", channelId).maybeSingle();
    setChannel(c);
    if (!c || c.type === "voice") { setMessages([]); setReactions([]); return; }

    const { data: msgs } = await supabase.from("messages")
      .select("*").eq("channel_id", channelId).is("thread_root", null).order("created_at", { ascending: true }).limit(100);
    const list = (msgs ?? []) as Msg[];
    const authors = Array.from(new Set(list.map((m) => m.author_id)));
    if (authors.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", authors);
      (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
    }
    list.forEach((m) => { m.author = profilesCache.current.get(m.author_id) ?? null; });
    setMessages(list);
    setHasMore(list.length >= 100);

    if (list.length) {
      const ids = list.map((m) => m.id);
      const { data: rx } = await supabase.from("message_reactions").select("*").in("message_id", ids);
      setReactions((rx ?? []) as Reaction[]);
    } else setReactions([]);

    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  // Infinite scroll: load older messages
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMore || !hasMore) return;
      setLoadingMore(true);
      const oldest = messages[0];
      prevScrollHeight.current = scrollRef.current?.scrollHeight || 0;
      supabase.from("messages")
        .select("*").eq("channel_id", channelId).is("thread_root", null)
        .lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(50)
        .then(async ({ data }) => {
          const older = (data ?? []).reverse() as Msg[];
          if (older.length < 50) setHasMore(false);
          if (!older.length) { setLoadingMore(false); return; }
          const authors = Array.from(new Set(older.map((m) => m.author_id)));
          if (authors.length) {
            const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", authors);
            (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
          }
          older.forEach((m) => { m.author = profilesCache.current.get(m.author_id) ?? null; });
          setMessages((prev) => [...older, ...prev]);
          setLoadingMore(false);
          requestAnimationFrame(() => {
            if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevScrollHeight.current;
          });
        });
    }, { rootMargin: "200px" });
    if (sentinelRef.current) obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, messages.length, channelId]);

  useEffect(() => { setMessages([]); setReactions([]); setReplyTo(null); setEditing(null); load(); }, [channelId]);

  // Realtime: mensagens + reações (via Supabase)
  useEffect(() => {
    if (!channel || channel.type === "voice") return;
    const ch = supabase.channel(`channel-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Msg;
          if (m.thread_root) return; // threads are loaded separately
          m.author = await fetchProfile(m.author_id);
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Msg;
          m.author = await fetchProfile(m.author_id);
          setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, ...m } : x));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id)))
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          if (payload.eventType === "INSERT") setReactions((p) => [...p, payload.new as Reaction]);
          else if (payload.eventType === "DELETE") setReactions((p) => p.filter((r) => r.id !== (payload.old as any).id));
        })
      .subscribe();
    typingChan.current = ch;
    return () => { supabase.removeChannel(ch); typingChan.current = null; };
  }, [channelId, user?.id, channel?.type]);

  // Socket.io: presence + channel join + typing
  useEffect(() => {
    if (!user) return;
    const s = getSocket(user.id);
    sockRef.current = s;

    const onConnect = () => {
      s.emit("presence:join", { userId: user.id, serverId });
      if (channelId) s.emit("channel:join", channelId);
    };
    const onUsers = (users: { userId: string; status: string }[]) => {
      const m = new Map<string, string>();
      users.forEach((u) => m.set(u.userId, u.status || "online"));
      setPresence(m);
    };
    const onTypingStart = ({ userId: uid, username }: { userId: string; username: string }) => {
      if (uid === user.id) return;
      setTyping((prev) => ({ ...prev, [uid]: { name: username, t: Date.now() } }));
    };
    const onTypingStop = ({ userId: uid }: { userId: string }) => {
      setTyping((prev) => { const n = { ...prev }; delete n[uid]; return n; });
    };

    if (s.connected) onConnect();
    s.on("connect", onConnect);
    s.on("presence:users", onUsers);
    s.on("typing:start", onTypingStart);
    s.on("typing:stop", onTypingStop);

    const interval = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.t < 4000) next[k] = v;
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      s.off("connect", onConnect);
      s.off("presence:users", onUsers);
      s.off("typing:start", onTypingStart);
      s.off("typing:stop", onTypingStop);
      if (channelId) s.emit("channel:leave", channelId);
      sockRef.current = null;
    };
  }, [user?.id, serverId, channelId]);

  function emitTyping() {
    const s = sockRef.current;
    if (!s) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    s.emit("typing:start", { channelId, username: profile?.display_name || profile?.username });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText(""); const reply = replyTo?.id ?? null; setReplyTo(null);
    await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content, reply_to: reply });
    setSending(false);
  }

  async function react(msg: Msg, emoji: string) {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === msg.id && r.emoji === emoji && r.user_id === user.id);
    if (mine) {
      await supabase.from("message_reactions").delete().eq("id", mine.id);
    } else {
      await supabase.from("message_reactions").insert({ message_id: msg.id, emoji, user_id: user.id });
    }
  }

  async function removeMsg(m: Msg) {
    if (!confirm("Apagar essa mensagem?")) return;
    await supabase.from("messages").delete().eq("id", m.id);
  }

  async function saveEdit() {
    if (!editing) return;
    const content = editText.trim();
    if (!content) return;
    await supabase.from("messages").update({ content, edited_at: new Date().toISOString() }).eq("id", editing.id);
    setEditing(null);
  }

  async function uploadFile(file: File) {
    if (!user || uploading) return;
    setUploading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("channel_id", channelId);
      const res = await fetch(`${apiUrl}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload falhou"); }
      const { url } = await res.json();
      setText((prev) => prev + ` ${url} `);
      toast.success("Arquivo anexado");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  function insertGif(url: string) {
    setText((prev) => prev + ` ![gif](${url}) `);
  }

  function insertSticker(url: string) {
    setText((prev) => prev + ` ![sticker](${url}) `);
  }

  if (!channel) return <div className="p-8 text-muted-foreground">Carregando canal…</div>;

  const isVoice = channel.type === "voice";

  return (
    <div className="flex flex-col h-full">
      <header className="h-12 border-b border-border px-3 sm:px-4 flex items-center gap-2 bg-card/30 backdrop-blur shrink-0">
        <Link to="/app/servers/$serverId" params={{ serverId }} className="md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        {isVoice ? <Volume2 className="h-5 w-5 text-muted-foreground" /> : <Hash className="h-5 w-5 text-muted-foreground" />}
        <h2 className="font-semibold truncate">{channel.name}</h2>
        {channel.topic && <span className="text-sm text-muted-foreground border-l border-border pl-3 ml-1 truncate hidden sm:inline">{channel.topic}</span>}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-muted-foreground lg:hidden">
                <Users className="h-3.5 w-3.5" />
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                {Array.from(presence.values()).filter((s) => s !== "offline").length}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[280px]">
              <MemberList serverId={serverId} presence={presence} />
            </SheetContent>
          </Sheet>
          <span className="hidden lg:inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            {Array.from(presence.values()).filter((s) => s !== "offline").length}
          </span>
        </div>
      </header>

      {isVoice ? (
        <div className="flex-1 min-h-0">
          <VoiceRoom room={`panela-${channelId}`} channelId={channelId} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-auto px-2 sm:px-4 py-3 space-y-0.5">
            {/* Infinite scroll sentinel */}
            {hasMore && <div ref={sentinelRef} className="h-4" />}
            {loadingMore && <p className="text-xs text-muted-foreground text-center py-2">Carregando mais…</p>}

            {messages.length === 0 && !loadingMore && (
              <div className="text-center text-muted-foreground py-12">
                <Hash className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Bem-vindo a #{channel.name}</p>
                <p className="text-sm">Esse é o começo desse canal. Diz oi!</p>
              </div>
            )}
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const sameAuthor = prev && prev.author_id === m.author_id && !m.reply_to && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
              const replied = m.reply_to ? messages.find((x) => x.id === m.reply_to) : null;
              const myRx = reactionsGrouped(reactions, m.id);
              return (
                <div key={m.id} className={`group relative flex gap-3 hover:bg-accent/30 px-2 py-0.5 rounded ${sameAuthor ? "pl-13" : "pt-2"}`}>
                  {!sameAuthor ? (
                    <Link to="/app/u/$slug" params={{ slug: m.author_id }}
                      className="h-10 w-10 mt-0.5 shrink-0 rounded-full overflow-hidden hover:ring-2 ring-primary/60 transition-all">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={m.author?.avatar_url ?? undefined} />
                        <AvatarFallback>{(m.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                  ) : <div className="w-10 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    {replied && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5 truncate">
                        <CornerUpLeft className="h-3 w-3" /> @{replied.author?.username ?? "alguém"}: <span className="truncate opacity-80">{replied.content}</span>
                      </div>
                    )}
                    {!sameAuthor && (
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {m.author ? <UsernameBadge profile={m.author as any} /> : <span className="text-muted-foreground">…</span>}
                        <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                      </div>
                    )}
                    {editing?.id === m.id ? (
                      <div className="flex gap-2 items-center mt-1">
                        <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); if (e.key === "Enter") saveEdit(); }} />
                        <Button size="icon" onClick={saveEdit}><Check className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(null)}><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <div>
                        {m.content && (
                          <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1 prose-pre:bg-muted prose-code:text-primary prose-a:text-primary prose-img:rounded-lg">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {m.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        {m.edited_at && <span className="text-[10px] text-muted-foreground ml-1">(editado)</span>}
                        {m.attachment_url && (
                          <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-2 rounded-lg border border-border bg-accent/30 px-3 py-2 text-sm hover:bg-accent/60 transition-colors">
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
                        {myRx.map(([emoji, list]) => {
                          const mine = list.some((r) => r.user_id === user?.id);
                          return (
                            <button key={emoji} onClick={() => react(m, emoji)} className={`text-xs rounded-full border px-1.5 py-0.5 flex items-center gap-1 ${mine ? "bg-primary/15 border-primary/40 text-primary" : "bg-accent/40 border-border"}`}>
                              <span>{emoji}</span><span>{list.length}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {/* Toolbar mensagem */}
                  <div className="message-toolbar opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="!h-7 !w-7 sm:!h-8 sm:!w-8"><Smile className="h-4 w-4" /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-1 w-auto" side="top" align="start">
                        <div className="flex gap-0.5">
                          {EMOJIS.map((e) => (
                            <button key={e} onClick={() => react(m, e)} className="text-lg hover:bg-accent rounded p-1.5 sm:p-1">{e}</button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="!h-7 !w-7 sm:!h-8 sm:!w-8" onClick={() => setReplyTo(m)}>
                      <CornerUpLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="!h-7 !w-7 sm:!h-8 sm:!w-8" onClick={() => navigate({ to: "/app/servers/$serverId/threads/$messageId", params: { serverId, messageId: m.id } })}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    {m.author_id === user?.id && (
                      <>
                        <Button variant="ghost" size="icon" className="!h-7 !w-7 sm:!h-8 sm:!w-8" onClick={() => { setEditing(m); setEditText(m.content ?? ""); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="!h-7 !w-7 sm:!h-8 sm:!w-8 text-destructive" onClick={() => removeMsg(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <ReportDialog messageId={m.id} channelId={channelId} />
                  </div>
                </div>
              );
            })}
            {Object.values(typing).length > 0 && (
              <div className="px-3 text-xs text-muted-foreground italic">
                {Object.values(typing).map((t) => t.name).join(", ")} digitando…
              </div>
            )}
          </div>

          <form onSubmit={send} className="p-2 sm:p-3 border-t border-border bg-card/40 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0">
            {replyTo && (
              <div className="mb-1.5 text-xs flex items-center justify-between px-3 py-1.5 rounded-lg bg-accent/50 border border-border">
                <span className="truncate"><CornerUpLeft className="inline h-3 w-3 mr-1" />respondendo @{replyTo.author?.username ?? "alguém"}: <span className="opacity-70">{replyTo.content}</span></span>
                <button type="button" onClick={() => setReplyTo(null)} className="p-1.5 touch-grow-sm"><X className="h-4 w-4" /></button>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-background rounded-xl border border-border px-1.5 sm:px-2 py-1 sm:py-1.5">
              <input type="file" ref={fileRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
              <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()} className="text-muted-foreground hover:text-primary disabled:opacity-40 p-1.5 sm:p-1 shrink-0 touch-grow-sm">
                <Paperclip className="h-5 w-5" />
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary px-1.5 sm:px-1 shrink-0 text-sm font-bold h-9 min-w-[2.5rem]">
                    GIF
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-auto p-2" align="start">
                  <GifPicker onSelect={insertGif} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary p-1.5 sm:p-1 shrink-0 h-9 min-w-[2.5rem] grid place-items-center">
                    <Smile className="h-5 w-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-auto p-2" align="start">
                  <StickerPicker onSelect={insertSticker} serverId={serverId} />
                </PopoverContent>
              </Popover>
              <Input
                value={text}
                onChange={(e) => { setText(e.target.value); emitTyping(); }}
                placeholder={`Mensagem em #${channel.name}`}
                className="bg-transparent border-0 h-10 sm:h-11 flex-1 min-w-0 px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm sm:text-base"
                maxLength={2000}
              />
              <button type="submit" disabled={!text.trim() || sending}
                className="text-muted-foreground hover:text-primary disabled:opacity-30 p-1.5 sm:p-1 shrink-0 touch-grow-sm transition-colors">
                <SendHorizontal className="h-5 w-5" />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function reactionsGrouped(all: Reaction[], msgId: string): Array<[string, Reaction[]]> {
  const map = new Map<string, Reaction[]>();
  for (const r of all) {
    if (r.message_id !== msgId) continue;
    const arr = map.get(r.emoji) ?? [];
    arr.push(r); map.set(r.emoji, arr);
  }
  return Array.from(map.entries());
}
