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
import { getSocket } from "@/lib/socket";
import { SendHorizontal, Paperclip, X, Trash2, CornerUpLeft } from "lucide-react";
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
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<DM[]>([]);
  const [otherProfile, setOtherProfile] = useState<any>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<DM | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const profilesCache = useRef<Map<string, any>>(new Map());

  async function load() {
    const [msgRes, partRes] = await Promise.all([
      supabase.from("dm_messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(100),
      supabase.from("dm_participants").select("user_id, profiles!inner(username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan)").eq("conversation_id", conversationId),
    ]);
    const msgs = (msgRes.data ?? []) as DM[];
    setMessages(msgs);

    const participants = partRes.data ?? [];
    const other = participants.find((p: any) => p.user_id !== user?.id);
    if (other) setOtherProfile((other as any).profiles);

    const authors = [...new Set([...msgs.map((m) => m.author_id), ...participants.map((p: any) => p.user_id)])];
    if (authors.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").in("id", authors);
      (profs ?? []).forEach((p: any) => profilesCache.current.set(p.id, p));
    }
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }));
  }

  useEffect(() => { setMessages([]); setOtherProfile(null); load(); }, [conversationId]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`dm-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        async (payload) => {
          const m = payload.new as DM;
          if (!profilesCache.current.has(m.author_id)) {
            const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url,name_color,name_colors,name_effect,current_plan").eq("id", m.author_id).maybeSingle();
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

  const other = otherProfile;
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

      <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-3 space-y-1">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            <p className="font-medium">Início da conversa</p>
            <p className="text-sm">Mande uma mensagem para {other?.display_name || other?.username || "seu contato"}!</p>
          </div>
        )}
        {messages.map((m) => {
          const isMine = m.author_id === user?.id;
          const profile = authorProfile(m.author_id);
          return (
            <div key={m.id} className={`group flex gap-2.5 ${isMine ? "flex-row-reverse" : ""}`}>
              <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div className={`min-w-0 max-w-[75%] ${isMine ? "items-end" : ""}`}>
                {!isMine && profile && (
                  <p className="text-xs font-medium mb-0.5 ml-1"><UsernameBadge profile={profile} /></p>
                )}
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${
                  isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-accent rounded-bl-md"
                }`}>
                  {m.content && <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>}
                  {m.attachment_url && (
                    <a href={m.attachment_url} target="_blank" rel="noopener noreferrer"
                      className="block mt-1 text-xs underline opacity-80">{m.attachment_url.split("/").pop()}</a>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 px-1">
                  {new Date(m.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {isMine && (
                <button onClick={() => removeMsg(m)} className="opacity-0 group-hover:opacity-100 transition-opacity self-center p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-2 sm:p-3 border-t border-border bg-card/40 pb-safe shrink-0">
        {replyTo && (
          <div className="mb-1.5 flex items-center justify-between px-2 py-1 rounded bg-accent/50 border border-border text-xs">
            <span className="truncate"><CornerUpLeft className="inline h-3 w-3 mr-1" />respondendo</span>
            <button type="button" onClick={() => setReplyTo(null)}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <input type="file" ref={fileRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, conversationId, user?.id); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()} className="text-muted-foreground hover:text-primary p-1 shrink-0">
            <Paperclip className="h-5 w-5" />
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mensagem..."
            className="bg-input border-border h-11"
            maxLength={2000}
          />
          <button type="submit" disabled={!text.trim() || sending} className="text-muted-foreground hover:text-primary disabled:opacity-40 p-1 shrink-0">
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

async function uploadFile(file: File, conversationId: string, userId?: string) {
  if (!userId) return;
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
    toast.success("Arquivo anexado");
  } catch { toast.error("Erro no upload"); }
}
