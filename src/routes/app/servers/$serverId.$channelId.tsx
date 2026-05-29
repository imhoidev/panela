import { createFileRoute, useParams, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { VoiceRoom } from "@/components/VoiceRoom";
import { Button } from "@/components/ui/button";
import {
  Hash, SendHorizontal, Smile, CornerUpLeft, X, Trash2, Pencil, Check, Volume2, ArrowLeft,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { sendChannelPush } from "@/lib/push.functions";
import { useServerFn } from "@tanstack/react-start";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "🥹", "🤝", "👀", "🎉", "💯", "🍳"];

type Msg = {
  id: string; content: string | null; created_at: string; author_id: string; channel_id: string;
  reply_to: string | null; edited_at: string | null;
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
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [editing, setEditing] = useState<Msg | null>(null);
  const [editText, setEditText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const profilesCache = useRef<Map<string, Msg["author"]>>(new Map());
  const typingChan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

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
      .select("*").eq("channel_id", channelId).order("created_at", { ascending: true }).limit(100);
    const list = (msgs ?? []) as Msg[];
    const authors = Array.from(new Set(list.map((m) => m.author_id)));
    if (authors.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", authors);
      (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
    }
    list.forEach((m) => { m.author = profilesCache.current.get(m.author_id) ?? null; });
    setMessages(list);

    if (list.length) {
      const ids = list.map((m) => m.id);
      const { data: rx } = await supabase.from("message_reactions").select("*").in("message_id", ids);
      setReactions((rx ?? []) as Reaction[]);
    } else setReactions([]);

    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  useEffect(() => { setMessages([]); setReactions([]); setReplyTo(null); setEditing(null); load(); }, [channelId]);

  // Realtime: mensagens + reações + typing presence
  useEffect(() => {
    if (!channel || channel.type === "voice") return;
    const ch = supabase.channel(`channel-${channelId}`, { config: { presence: { key: user?.id ?? "anon" } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Msg;
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
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.user_id || payload.user_id === user?.id) return;
        setTyping((prev) => ({ ...prev, [payload.user_id]: { name: payload.name, t: Date.now() } }));
      })
      .subscribe();
    typingChan.current = ch;
    const interval = setInterval(() => {
      setTyping((prev) => {
        const now = Date.now();
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.t < 4000) next[k] = v;
        return next;
      });
    }, 1000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); typingChan.current = null; };
  }, [channelId, user?.id, channel?.type]);

  function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    typingChan.current?.send({ type: "broadcast", event: "typing", payload: { user_id: user?.id, name: profile?.display_name || profile?.username } });
  }

  const pushFn = useServerFn(sendChannelPush);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText(""); const reply = replyTo?.id ?? null; setReplyTo(null);
    const { error } = await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content, reply_to: reply });
    setSending(false);
    if (error) { setText(content); toast.error(error.message); return; }
    // Notifica membros do canal (fire-and-forget).
    const senderName = profile?.display_name || profile?.username || "alguém";
    pushFn({ data: {
      channelId,
      title: `#${channel?.name ?? "canal"} · ${senderName}`,
      body: content.slice(0, 240),
      url: `/app/servers/${serverId}/${channelId}`,
      tag: `ch-${channelId}`,
    } }).catch(() => {});
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
    const { error } = await supabase.from("messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  }

  async function saveEdit() {
    if (!editing) return;
    const content = editText.trim();
    if (!content) return;
    const { error } = await supabase.from("messages").update({ content, edited_at: new Date().toISOString() }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
  }

  if (!channel) return <div className="p-8 text-muted-foreground">Carregando canal…</div>;

  const isVoice = channel.type === "voice";

  return (
    <div className="flex flex-col h-full">
      <header className="h-12 border-b border-border px-3 sm:px-4 flex items-center gap-2 bg-card/30 backdrop-blur">
        <Link to="/app/servers/$serverId" params={{ serverId }} className="md:hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        {isVoice ? <Volume2 className="h-5 w-5 text-muted-foreground" /> : <Hash className="h-5 w-5 text-muted-foreground" />}
        <h2 className="font-semibold truncate">{channel.name}</h2>
        {channel.topic && <span className="text-sm text-muted-foreground border-l border-border pl-3 ml-1 truncate hidden sm:inline">{channel.topic}</span>}
      </header>

      {isVoice ? (
        <div className="flex-1 min-h-0">
          <VoiceRoom room={`panela-${channelId}`} channelId={channelId} />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-auto px-2 sm:px-4 py-3 space-y-0.5">
            {messages.length === 0 && (
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
                    <Avatar className="h-10 w-10 mt-0.5 shrink-0">
                      <AvatarImage src={m.author?.avatar_url ?? undefined} />
                      <AvatarFallback>{(m.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
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
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {m.content}
                        {m.edited_at && <span className="text-[10px] text-muted-foreground ml-1">(editado)</span>}
                      </p>
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
                  <div className="absolute -top-3 right-2 hidden group-hover:flex bg-card border border-border rounded-md shadow px-0.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Smile className="h-4 w-4" /></Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-1 w-auto">
                        <div className="flex gap-0.5">
                          {EMOJIS.map((e) => (
                            <button key={e} onClick={() => react(m, e)} className="text-lg hover:bg-accent rounded p-1">{e}</button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setReplyTo(m)}><CornerUpLeft className="h-4 w-4" /></Button>
                    {m.author_id === user?.id && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(m); setEditText(m.content ?? ""); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMsg(m)}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
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

          <form onSubmit={send} className="p-2 sm:p-3 border-t border-border bg-card/40 pb-safe">
            {replyTo && (
              <div className="mb-1.5 text-xs flex items-center justify-between px-2 py-1 rounded bg-accent/50 border border-border">
                <span className="truncate"><CornerUpLeft className="inline h-3 w-3 mr-1" />respondendo @{replyTo.author?.username ?? "alguém"}: <span className="opacity-70">{replyTo.content}</span></span>
                <button type="button" onClick={() => setReplyTo(null)}><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
            <div className="relative">
              <Input
                value={text}
                onChange={(e) => { setText(e.target.value); emitTyping(); }}
                placeholder={`Mensagem em #${channel.name}`}
                className="pr-10 bg-input border-border h-11"
                maxLength={2000}
              />
              <button type="submit" disabled={!text.trim() || sending} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary disabled:opacity-40 p-1">
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
