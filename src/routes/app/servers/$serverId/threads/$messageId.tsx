import { createFileRoute, useParams, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CornerUpLeft, SendHorizontal, Hash } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string; content: string | null; created_at: string; author_id: string; channel_id: string;
  reply_to: string | null; thread_root: string | null;
  author?: { username: string; display_name: string | null; avatar_url: string | null; name_color: string | null } | null;
};

export const Route = createFileRoute("/app/servers/$serverId/threads/$messageId")({
  component: ThreadView,
});

function ThreadView() {
  const { serverId, messageId } = useParams({ from: "/app/servers/$serverId/threads/$messageId" });
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [root, setRoot] = useState<Msg | null>(null);
  const [replies, setReplies] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function fetchProfile(uid: string) {
    const { data } = await supabase.from("profiles").select("username,display_name,avatar_url,name_color").eq("id", uid).maybeSingle();
    return data as any;
  }

  useEffect(() => {
    if (!messageId) return;
    supabase.from("messages").select("*").eq("id", messageId).maybeSingle().then(async ({ data }) => {
      if (!data) return;
      const root = data as Msg;
      root.author = await fetchProfile(root.author_id);
      setRoot(root);
    });
    supabase.from("messages").select("*").eq("thread_root", messageId).order("created_at", { ascending: true }).then(async ({ data }) => {
      const list = (data ?? []) as Msg[];
      for (const m of list) m.author = await fetchProfile(m.author_id);
      setReplies(list);
    });
  }, [messageId]);

  useEffect(() => {
    if (!messageId) return;
    const ch = supabase.channel(`thread-${messageId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_root=eq.${messageId}` },
        async (payload) => {
          const m = payload.new as Msg;
          m.author = await fetchProfile(m.author_id);
          setReplies((prev) => [...prev, m]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [messageId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending || !root?.channel_id) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      channel_id: root.channel_id, author_id: user.id, content: text.trim(), thread_root: messageId,
    });
    setText(""); setSending(false);
    if (error) toast.error(error.message);
  }

  if (!root) return <div className="p-8 text-muted-foreground">Carregando thread…</div>;

  return (
    <div className="flex flex-col h-full">
      <header className="h-12 border-b border-border px-3 sm:px-4 flex items-center gap-2 bg-card/30 backdrop-blur shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate({ to: "/app/servers/$serverId/$channelId", params: { serverId, channelId: root.channel_id } })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Hash className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold truncate">Thread</h2>
        <span className="text-sm text-muted-foreground">{replies.length} respostas</span>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-3 space-y-3">
        <div className="flex gap-3 pb-3 border-b border-border">
          <Avatar className="h-10 w-10 mt-0.5 shrink-0">
            <AvatarImage src={root.author?.avatar_url ?? undefined} />
            <AvatarFallback>{(root.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              {root.author ? <UsernameBadge profile={root.author as any} /> : <span className="text-muted-foreground">…</span>}
              <span className="text-[11px] text-muted-foreground">{new Date(root.created_at).toLocaleString("pt-BR")}</span>
            </div>
            {root.content && (
              <div className="text-sm prose prose-sm prose-invert max-w-none mt-1">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{root.content}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>

        {replies.map((m) => (
          <div key={m.id} className="flex gap-3">
            <Avatar className="h-8 w-8 mt-0.5 shrink-0">
              <AvatarImage src={m.author?.avatar_url ?? undefined} />
              <AvatarFallback>{(m.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                {m.author ? <UsernameBadge profile={m.author as any} /> : <span className="text-muted-foreground">…</span>}
                <span className="text-[11px] text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR")}</span>
              </div>
              {m.content && (
                <div className="text-sm prose prose-sm prose-invert max-w-none mt-0.5">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {!replies.length && <p className="text-sm text-muted-foreground text-center py-8">Nenhuma resposta ainda. Seja o primeiro!</p>}
      </div>

      <form onSubmit={send} className="p-3 border-t border-border bg-card/40 shrink-0">
        <div className="flex items-center gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Responder na thread…" className="bg-input border-border h-10" />
          <button type="submit" disabled={!text.trim() || sending} className="text-muted-foreground hover:text-primary disabled:opacity-40 p-1">
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
