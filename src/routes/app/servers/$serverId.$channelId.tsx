import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Hash, SendHorizontal } from "lucide-react";

export const Route = createFileRoute("/app/servers/$serverId/$channelId")({
  component: ChannelView,
});

type Msg = {
  id: string; content: string | null; created_at: string; author_id: string; channel_id: string;
  author?: { username: string; display_name: string | null; avatar_url: string | null; name_color: string | null; name_colors: any; name_effect: string | null; current_plan: string };
};

function ChannelView() {
  const { serverId, channelId } = useParams({ from: "/app/servers/$serverId/$channelId" });
  const { user } = useAuth();
  const [channel, setChannel] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profilesCache = useRef<Map<string, Msg["author"]>>(new Map());

  async function fetchProfile(uid: string): Promise<Msg["author"] | undefined> {
    if (profilesCache.current.has(uid)) return profilesCache.current.get(uid);
    const { data } = await supabase.from("profiles").select("username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", uid).maybeSingle();
    if (data) profilesCache.current.set(uid, data as any);
    return data as any;
  }

  async function load() {
    const [{ data: c }, { data: msgs }] = await Promise.all([
      supabase.from("channels").select("*").eq("id", channelId).maybeSingle(),
      supabase.from("messages").select("*").eq("channel_id", channelId).order("created_at", { ascending: true }).limit(100),
    ]);
    setChannel(c);
    const list = (msgs ?? []) as Msg[];
    const authors = Array.from(new Set(list.map((m) => m.author_id)));
    const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", authors);
    (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
    list.forEach((m) => { m.author = profilesCache.current.get(m.author_id); });
    setMessages(list);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  useEffect(() => { setMessages([]); load(); }, [channelId]);

  useEffect(() => {
    const ch = supabase.channel(`messages-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as Msg;
          m.author = await fetchProfile(m.author_id);
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ channel_id: channelId, author_id: user.id, content });
    setSending(false);
    if (error) { setText(content); }
  }

  if (!channel) return <div className="p-8 text-muted-foreground">Carregando canal…</div>;

  return (
    <div className="flex flex-col h-full">
      <header className="h-12 border-b border-border px-4 flex items-center gap-2">
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">{channel.name}</h2>
        {channel.topic && <span className="text-sm text-muted-foreground border-l border-border pl-3 ml-1 truncate">{channel.topic}</span>}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <Hash className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Bem-vindo a #{channel.name}</p>
            <p className="text-sm">Esse é o começo desse canal. Diz oi!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = messages[i - 1];
          const sameAuthor = prev && prev.author_id === m.author_id && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
          return (
            <div key={m.id} className={`flex gap-3 hover:bg-accent/30 px-2 py-0.5 rounded ${sameAuthor ? "pl-13" : "pt-2"}`}>
              {!sameAuthor ? (
                <Avatar className="h-10 w-10 mt-0.5">
                  <AvatarImage src={m.author?.avatar_url ?? undefined} />
                  <AvatarFallback>{(m.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              ) : <div className="w-10 shrink-0" />}
              <div className="min-w-0 flex-1">
                {!sameAuthor && (
                  <div className="flex items-baseline gap-2">
                    {m.author ? (
                      <UsernameBadge profile={m.author as any} />
                    ) : <span className="text-muted-foreground">…</span>}
                    <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-3 border-t border-border">
        <div className="relative">
          <Input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder={`Mensagem em #${channel.name}`}
            className="pr-10 bg-input border-border"
            maxLength={2000}
          />
          <button type="submit" disabled={!text.trim() || sending} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary disabled:opacity-40">
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
