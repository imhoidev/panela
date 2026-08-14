import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UsernameBadge } from "@/components/UsernameBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportDialog } from "@/components/ModPanel";
import { useChatContext } from "./ChatContext";
import { MediaAttachment } from "@/components/MediaLightbox";
import {
  CornerUpLeft, Smile, Pencil, Trash2, MessageSquare,
  Check, X, Paperclip, Pin,
} from "lucide-react";
import type { ChatMessage } from "@/hooks/useChat";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "🥹", "🤝", "👀", "🎉", "💯", "🍳"];

type Reaction = { id: string; message_id: string; emoji: string; user_id: string };
type Props = {
  message: ChatMessage;
  sameAuthor: boolean;
  replied: ChatMessage | null;
  reactions: Reaction[];
  isTemp?: boolean;
  onReact: (msg: ChatMessage, emoji: string) => void;
  onDelete: (msg: ChatMessage) => void;
  onSaveEdit: () => void;
  onTogglePin?: (msg: ChatMessage) => void;
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

function reactionsGrouped(all: Reaction[], msgId: string): Array<[string, Reaction[]]> {
  const map = new Map<string, Reaction[]>();
  for (const r of all) {
    if (r.message_id !== msgId) continue;
    const arr = map.get(r.emoji) ?? [];
    arr.push(r);
    map.set(r.emoji, arr);
  }
  return Array.from(map.entries());
}

export const MessageItem = memo(function MessageItem({
  message: m, sameAuthor, replied, reactions, isTemp, onReact, onDelete, onSaveEdit, onTogglePin,
}: Props) {
  const { userId, roleCache, editingId, editText, setEditing, setEditText, cancelEdit, setReplyTo } = useChatContext();
  const myRx = reactionsGrouped(reactions, m.id);
  const roles = roleCache.get(m.author_id) ?? [];
  const topRole = [...roles].sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];

  const isEditing = editingId === m.id;

  return (
    <div className={`group relative flex gap-2.5 px-2 py-0.5 rounded-lg hover:bg-accent/10 transition-colors ${sameAuthor ? "pl-[3.25rem]" : "pt-1.5"} ${isTemp ? "opacity-60" : ""} ${m.is_pinned ? "bg-amber-500/5 border-l-2 border-amber-500/40" : ""}`}>
      {!sameAuthor ? (
        <Link to="/app/u/$slug" params={{ slug: m.author_id }}
          className="h-9 w-9 mt-0.5 shrink-0 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary/40 transition-all shadow-sm">
          <Avatar className="h-full w-full">
            <AvatarImage src={m.author?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-muted/50">{(m.author?.username ?? "?")[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
      ) : (
        <div className="w-9 shrink-0 text-right pt-0.5">
          <span className="text-[10px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity select-none cursor-default">
            {relativeTime(m.created_at)}
          </span>
        </div>
      )}

      <div className="min-w-0 flex-1 -mt-0.5">
        {m.is_pinned && (
          <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-medium mb-1">
            <Pin className="h-3 w-3 fill-amber-400/30" />
            <span>Mensagem fixada</span>
          </div>
        )}

        {replied && (
          <div className="text-xs text-muted-foreground/60 flex items-center gap-1 mb-0.5 truncate border-l-2 border-primary/30 pl-2 hover:border-primary/50 transition-colors">
            <CornerUpLeft className="h-3 w-3 shrink-0" />
            <span className="font-medium text-foreground/60">@{replied.author?.username ?? "alguém"}</span>
            <span className="truncate opacity-70">{replied.content}</span>
          </div>
        )}

        {!sameAuthor && (
          <div className="flex items-baseline gap-1.5 flex-wrap">
            {m.author ? <UsernameBadge profile={m.author as any} /> : <span className="text-sm text-muted-foreground">…</span>}
            {topRole && (
              topRole.gif_tag_url ? (
                <img src={topRole.gif_tag_url} alt="" className="h-4 w-4 rounded-sm object-cover shrink-0" title={topRole.name} />
              ) : (
                <span className="text-[10px] font-medium leading-none px-1.5 py-0.5 rounded shrink-0"
                  style={{ color: topRole.color || undefined, backgroundColor: topRole.color ? `${topRole.color}18` : "bg-accent/40" }}>
                  {topRole.name}
                </span>
              )
            )}
            <span className="text-[10px] text-muted-foreground/40" title={new Date(m.created_at).toLocaleString("pt-BR")}>
              {relativeTime(m.created_at)}
            </span>
          </div>
        )}

        {isEditing ? (
          <div className="flex gap-2 items-center mt-1">
            <Input autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); if (e.key === "Enter") onSaveEdit(); }}
              className="h-9 text-sm bg-accent/20 border-border/60" />
            <Button size="icon" onClick={onSaveEdit} className="h-9 w-9 shrink-0"><Check className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={cancelEdit} className="h-9 w-9 shrink-0"><X className="h-4 w-4" /></Button>
          </div>
        ) : (
          <div className="mt-0.5">
            {m.content && (
              <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-headings:my-1 prose-pre:bg-muted/80 prose-code:text-primary/80 prose-a:text-primary prose-img:rounded-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            )}
            {m.edited_at && <span className="text-[10px] text-muted-foreground/30 ml-1">(editado)</span>}
            {m.attachment_url && (
              <MediaAttachment url={m.attachment_url} type={m.attachment_type}>
                <div className="mt-1.5 inline-flex items-center gap-2.5 rounded-lg border border-border/50 bg-accent/15 px-3 py-2 text-sm hover:bg-accent/30 transition-colors cursor-pointer">
                  {m.attachment_type?.startsWith("image/") ? (
                    <img src={m.attachment_url} alt="attachment" className="max-h-48 rounded-lg object-contain shadow-sm" />
                  ) : m.attachment_type?.startsWith("video/") ? (
                    <>
                      <div className="relative">
                        <video src={m.attachment_url} className="max-h-48 rounded-lg object-contain" />
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="h-12 w-12 rounded-full bg-black/50 grid place-items-center">
                            <span className="text-white text-2xl ml-0.5">▶</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : m.attachment_type?.startsWith("audio/") ? (
                    <audio src={m.attachment_url} controls className="max-w-full" onClick={(e) => e.stopPropagation()} />
                  ) : (
                    <><Paperclip className="h-4 w-4 text-muted-foreground" /><span className="truncate text-muted-foreground">{m.attachment_url.split("/").pop()}</span></>
                  )}
                </div>
              </MediaAttachment>
            )}
          </div>
        )}

        {myRx.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {myRx.map(([emoji, list]) => {
              const mine = list.some((r) => r.user_id === userId);
              return (
                <button key={emoji} onClick={() => onReact(m, emoji)}
                  className={`text-xs rounded-full border px-1.5 py-0.5 flex items-center gap-1 transition-all touch-manipulation ${
                    mine ? "bg-primary/15 border-primary/30 text-primary shadow-sm" : "bg-accent/30 border-border/50 text-muted-foreground hover:bg-accent/60 hover:border-border/70"
                  }`}>
                  <span>{emoji}</span><span className="text-[10px] font-medium">{list.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover actions — Discord-style toolbar */}
      {!isTemp && (
        <div className="absolute -top-2.5 right-2 hidden group-hover:flex items-center gap-0.5 rounded-lg border border-border/50 bg-card/95 backdrop-blur-md shadow-md px-1 py-0.5 z-10">
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors rounded hover:bg-accent/60 touch-manipulation"><Smile className="h-4 w-4" /></button>
            </PopoverTrigger>
            <PopoverContent className="p-1.5 w-auto" side="top" align="start">
              <div className="flex gap-0.5 flex-wrap max-w-[200px]">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => onReact(m, e)} className="text-lg hover:bg-accent rounded p-1.5 sm:p-1 transition-colors touch-manipulation">{e}</button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <button onClick={() => setReplyTo(m)} title="Responder" className="p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors rounded hover:bg-accent/60 touch-manipulation">
            <CornerUpLeft className="h-4 w-4" />
          </button>
          <button onClick={() => onTogglePin?.(m)} title={m.is_pinned ? "Desfixar" : "Fixar"} className={`p-1.5 transition-colors rounded hover:bg-accent/60 touch-manipulation ${m.is_pinned ? "text-amber-400" : "hover:text-foreground text-muted-foreground/50"}`}>
            <Pin className="h-4 w-4" />
          </button>
          <button onClick={() => setEditing(m)} title="Editar" className="p-1.5 hover:text-foreground text-muted-foreground/50 transition-colors rounded hover:bg-accent/60 touch-manipulation">
            <Pencil className="h-4 w-4" />
          </button>
          {m.author_id === userId && (
            <button onClick={() => onDelete(m)} title="Apagar" className="p-1.5 text-destructive/70 hover:text-destructive transition-colors rounded hover:bg-destructive/10 touch-manipulation">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <ReportDialog messageId={m.id} channelId={m.channel_id} />
        </div>
      )}
    </div>
  );
});

