import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Button } from "@/components/ui/button";
import { SendHorizontal, Paperclip, X, Trash2, CornerUpLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DM = {
  id: string; content: string | null; created_at: string; author_id: string;
  reply_to: string | null; edited_at: string | null;
  attachment_url: string | null; attachment_type: string | null;
};

export const Route = createFileRoute("/app/dms/$conversationId")({
  component: DMChat,
});

function DMChat() {
  const { conversationId } = useParams({ from: "/app/dms/$conversationId" });
  const { user } = useAuth();
  const [messages, setMessages] = useState<DM[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const profilesCache = useRef<Map<string, any>>(new Map());
  const prevScrollHeight = useRef(0);

  async function load() {
    setLoading(true);
    const authors: string[] = [];

    const { data: parts } = await supabase.rpc("get_dm_participants_single", { conv_id: conversationId });
    const pIds = (parts ?? []).map((p: any) => p.user_id);
    authors.push(...pIds);
    const otherId = pIds.find((id) => id !== user?.id);

    if (otherId) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
        .eq("id", otherId).maybeSingle();
      if (prof) { profilesCache.current.set(prof.id, prof); setOtherProfile(prof); }
    }

    const { data: msgs } = await supabase
      .from("dm_messages")
      .select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100);
    const list = (msgs ?? []) as DM[];
    authors.push(...list.map((m) => m.author_id));
    if (authors.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
        .in("id", [...new Set(authors)]);
      (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
    }
    setMessages(list);
    setHasMore(list.length >= 100);
    setLoading(false);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));

    // mark as read
    if (user) {
      await supabase.from("dm_participants").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId).eq("user_id", user.id);
    }
  }

  useEffect(() => {
    setMessages([]); setOtherProfile(null); setLoading(true); setHasMore(true); setReplyTo(null); load();
  }, [conversationId]);

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
          if (!profilesCache.current.has(m.author_id)) {
            const { data } = await supabase.from("profiles")
              .select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan")
              .eq("id", m.author_id).maybeSingle();
            if (data) profilesCache.current.set(m.author_id, data);
          }
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((prev) => prev.map((x) => x.id === (payload.new as DM).id ? { ...x, ...(payload.new as DM) } : x)))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText(""); const reply = replyTo?.id ?? null; setReplyTo(null);
    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: conversationId, author_id: user.id, content, reply_to: reply,
    });
    if (error) toast.error(error.message);
    setSending(false);
  }

  async function removeMsg(m: DM) {
    if (!confirm("Apagar?")) return;
    await supabase.from("dm_messages").delete().eq("id", m.id);
  }

  function authorProfile(authorId: string) {
    return profilesCache.current.get(authorId) ?? null;
  }

  function getRepliedMsg(m: DM): DM | undefined {
    return m.reply_to ? messages.find((x) => x.id === m.reply_to) : undefined;
  }

  const other = otherProfile;

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
    <div className="flex flex-col h-full">
      <header className="h-12 border-b border-border px-4 flex items-center gap-2.5 bg-card/30 backdrop-blur shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={other?.avatar_url ?? undefined} />
          <AvatarFallback>{other?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{other?.display_name || other?.username || "Carregando..."}</p>
          <p className="text-[10px] text-muted-foreground">@{other?.username || "..."}</p>
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

        {messages.map((m) => {
          const isMine = m.author_id === user?.id;
          const profile = authorProfile(m.author_id);
          const replied = getRepliedMsg(m);
          const repliedProfile = replied ? authorProfile(replied.author_id) : null;
          return (
            <div key={m.id} className={`group flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div className={`min-w-0 max-w-[75%] flex flex-col ${isMine ? "items-end" : ""}`}>
                {!isMine && profile && (
                  <p className="text-xs font-medium mb-0.5 ml-1"><UsernameBadge profile={profile} /></p>
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
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${
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
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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
          );
        })}
      </div>

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
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem..."
            className="bg-transparent border-0 h-10 sm:h-11 flex-1 min-w-0 px-1.5 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            maxLength={2000}
          />
          <button type="submit" disabled={!text.trim() || sending}
            className="text-primary/60 hover:text-primary disabled:opacity-25 p-1.5 shrink-0 transition-colors disabled:cursor-not-allowed">
            <SendHorizontal className="h-5 w-5" />
          </button>
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
