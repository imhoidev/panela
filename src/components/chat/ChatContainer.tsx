import { useState, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useChat, useChatCache, type ChatMessage } from "@/hooks/useChat";
import { useRealtimeSocket } from "@/hooks/useRealtime";
import { supabase } from "@/integrations/supabase/client";
import { ChatProvider, useChatContext } from "./ChatContext";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { toast } from "sonner";

type Reaction = { id: string; message_id: string; emoji: string; user_id: string };

type Props = {
  channelId: string;
  serverId?: string;
  channelName: string;
  channelType: string;
  channelDescription?: string | null;
  canPost: boolean;
  header?: ReactNode;
  onReact?: (msg: ChatMessage, emoji: string) => Promise<void>;
};

function ChatInner({
  channelId, serverId, channelName, channelType, channelDescription, canPost, header, onReact: externalReact,
}: Props) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { socket } = useRealtimeSocket();
  const { messages, tempMessages, isLoading, hasMore, fetchMore, sendMessage, editMessage, deleteMessage, togglePinMessage } = useChat(channelId, user?.id);

  async function handleTogglePin(m: ChatMessage) {
    togglePinMessage.mutate({ id: m.id, isPinned: !m.is_pinned });
  }
  const cache = useChatCache(channelId);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [typing, setTyping] = useState<Record<string, { name: string; t: number }>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [roleCache, setRoleCache] = useState<Map<string, any[]>>(new Map());
  const typingChan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const knownIds = useRef<Set<string>>(new Set());

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
    setRoleCache(userRoles);
  }

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

  useEffect(() => {
    if (isVoice) return;
    const ch = supabase.channel(`channel-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          const m = payload.new as any;
          if (m.thread_root || knownIds.current.has(m.id)) return;
          knownIds.current.add(m.id);
          cache.addMessage(m as ChatMessage);
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => { cache.updateMessage((payload.new as any).id, payload.new as any); })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => { const id = (payload.old as any).id; knownIds.current.delete(id); cache.removeMessage(id); })
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" },
        (payload) => {
          if (payload.eventType === "INSERT") setReactions((p) => [...p, payload.new as Reaction]);
          else if (payload.eventType === "DELETE") setReactions((p) => p.filter((r) => r.id !== (payload.old as any).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, isVoice]);

  useEffect(() => {
    if (!socket || isVoice) return;
    const onConnect = () => { socket.emit("channel:join", channelId); };
    const onMessageNew = async (m: ChatMessage) => {
      if (knownIds.current.has(m.id) || m.thread_root) return;
      knownIds.current.add(m.id);
      cache.addMessage(m as any);
    };
    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      knownIds.current.delete(messageId);
      cache.removeMessage(messageId);
    };
    const onMessageUpdated = (m: ChatMessage) => cache.updateMessage(m.id, m as any);
    const onTypingStart = ({ userId: uid, username }: { userId: string; username: string }) => {
      if (uid === user?.id) return;
      setTyping((prev) => ({ ...prev, [uid]: { name: username, t: Date.now() } }));
    };
    const onTypingStop = ({ userId: uid }: { userId: string }) => {
      setTyping((prev) => { const next: typeof prev = {}; Object.entries(prev).forEach(([key, value]) => { if (key !== uid) next[key] = value; }); return next; });
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
  }, [user?.id, channelId, isVoice]);

  function emitTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    if (socket) {
      socket.emit("typing:start", { channelId, username: profile?.display_name || profile?.username });
      return;
    }
    typingChan.current?.send({ type: "broadcast", event: "typing", payload: { userId: user!.id, username: profile?.display_name || profile?.username } });
  }

  async function handleSend(e: React.FormEvent) {
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
      // handled by hook
    } finally {
      setSending(false);
    }
  }

  async function handleReact(m: ChatMessage, emoji: string) {
    if (!user) return;
    if (externalReact) { await externalReact(m, emoji); return; }
    const mine = reactions.find((r) => r.message_id === m.id && r.emoji === emoji && r.user_id === user.id);
    if (mine) await supabase.from("message_reactions").delete().eq("id", mine.id);
    else await supabase.from("message_reactions").insert({ message_id: m.id, emoji, user_id: user.id });
  }

  async function handleDelete(m: ChatMessage) {
    if (!confirm("Apagar essa mensagem?")) return;
    knownIds.current.delete(m.id);
    if (socket) socket.emit("message:deleted", { channelId, messageId: m.id });
    try { await deleteMessage.mutateAsync(m.id); } catch {}
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const c = editText.trim();
    if (!c) return;
    try {
      await editMessage.mutateAsync({ id: editingId, content: c });
      cancelEdit();
    } catch {}
  }

  // These are provided by ChatContext - we need to access them
  // Actually, ChatContainer wraps ChatInner, so ChatContext is above us.
  // We use useChatContext inside MessageItem/MessageInput already.
  // For ChatContainer's own use, we need access - but we don't need it directly here.

  async function handleUploadFile(file: File) {
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
    } catch (err: any) { toast.error(err.message); } finally { setUploading(false); }
  }

  function insertGif(url: string) { setText((prev) => prev + ` ![gif](${url}) `); }
  function insertSticker(url: string) { setText((prev) => prev + ` ![sticker](${url}) `); }

  if (isVoice) return null;

  return (
    <div className="flex flex-col h-full relative">
      {header}
      <MessageList
        messages={messages}
        tempMessages={tempMessages}
        reactions={reactions}
        isLoading={isLoading}
        hasMore={Boolean(hasMore)}
        fetchMore={fetchMore}
        isRules={isRules}
        isForum={isForum}
        isAnnouncement={isAnnouncement}
        channelName={channelName}
        channelDescription={channelDescription}
        onReact={handleReact}
        onDelete={handleDelete}
        onSaveEdit={handleSaveEdit}
        onTogglePin={handleTogglePin}
      />
      <div>
        {Object.values(typing).length > 0 && (
          <div className="px-5 py-1 flex items-center gap-2 text-xs text-muted-foreground/60 italic">
            <span className="flex gap-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "200ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "400ms" }} />
            </span>
            {Object.values(typing).map((t) => t.name).join(", ")} digitando…
          </div>
        )}
      </div>
      <MessageInput
        channelName={channelName}
        text={text}
        sending={sending}
        uploading={uploading}
        canPost={canPost}
        isAnnouncement={isAnnouncement}
        isRules={isRules}
        serverId={serverId ?? ""}
        onTextChange={setText}
        onSubmit={handleSend}
        onUploadFile={handleUploadFile}
        onInsertGif={insertGif}
        onInsertSticker={insertSticker}
        onEmitTyping={emitTyping}
      />
    </div>
  );
}

export function ChatContainer(props: Props) {
  const { user } = useAuth();
  return (
    <ChatProvider userId={user?.id}>
      <ChatInner {...props} />
    </ChatProvider>
  );
}
