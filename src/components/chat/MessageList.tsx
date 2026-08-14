import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { MessageItem } from "./MessageItem";
import { useChatContext } from "./ChatContext";
import type { ChatMessage } from "@/hooks/useChat";
import { Skeleton } from "@/components/ui/skeleton";
import { Hash } from "lucide-react";

type Reaction = { id: string; message_id: string; emoji: string; user_id: string };

type Props = {
  messages: ChatMessage[];
  tempMessages: ChatMessage[];
  reactions: Reaction[];
  isLoading: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  isRules?: boolean;
  isForum?: boolean;
  isAnnouncement?: boolean;
  channelName: string;
  channelDescription?: string | null;
  onReact: (msg: ChatMessage, emoji: string) => void;
  onDelete: (msg: ChatMessage) => void;
  onSaveEdit: () => void;
  onTogglePin?: (msg: ChatMessage) => void;
};

function getDateLabel(date: string) {
  const d = new Date(date);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Hoje";
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  if (d >= weekAgo) return d.toLocaleDateString("pt-BR", { weekday: "long" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function SkeletonMessages() {
  return (
    <div className="flex-1 px-5 py-4 space-y-4 overflow-hidden">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <Skeleton className="h-9 w-9 rounded-full shrink-0 bg-accent/30" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-3 w-24 rounded bg-accent/30" />
              <Skeleton className="h-2 w-12 rounded bg-accent/20" />
            </div>
            <Skeleton className="h-3 w-3/4 rounded bg-accent/20" />
            <Skeleton className="h-3 w-1/2 rounded bg-accent/15" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ channelName, isAnnouncement }: { channelName: string; isAnnouncement?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground px-6">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 grid place-items-center mb-4 shadow-sm">
        <Hash className="h-6 w-6 text-primary/60" />
      </div>
      <p className="font-semibold text-foreground/80">Bem-vindo a <span className="text-primary">#{channelName}</span></p>
      <p className="text-sm mt-1.5 max-w-xs text-muted-foreground/60">{isAnnouncement ? "Anuncios importantes serao publicados aqui." : "Esse e o comeco do canal."}</p>
    </div>
  );
}

export function MessageList({
  messages, tempMessages, reactions, isLoading, hasMore, fetchMore,
  isRules, isForum, isAnnouncement, channelName, channelDescription,
  onReact, onDelete, onSaveEdit, onTogglePin,
}: Props) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const { roleCache, userId, editingId, editText, setEditing, setEditText, cancelEdit } = useChatContext();

  const allMessages = useMemo(() => {
    if (tempMessages.length > 0) return [...messages, ...tempMessages];
    return messages;
  }, [messages, tempMessages]);

  const items = useMemo(() => {
    if (isRules) return [];
    if (allMessages.length === 0) return [];
    return allMessages.map((m, i) => {
      const prev = allMessages[i - 1];
      const showDateSep = !prev || new Date(m.created_at).toDateString() !== new Date(prev.created_at).toDateString();
      const sameAuthor = prev && prev.author_id === m.author_id && !m.reply_to
        && (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000);
      const replied = m.reply_to ? allMessages.find((x) => x.id === m.reply_to) ?? null : null;
      return { message: m, sameAuthor, replied, showDateSep, key: m.id };
    });
  }, [allMessages, isRules]);

  const handleScrollToBottom = useCallback(() => {
    virtuosoRef.current?.scrollToIndex({ index: items.length - 1, behavior: "smooth" });
    setShowScrollBtn(false);
  }, [items.length]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) fetchMore();
  }, [hasMore, isLoading, fetchMore]);

  if (isRules) return null;

  if (isLoading && items.length === 0) return <SkeletonMessages />;

  if (items.length === 0) {
    return <EmptyState channelName={channelName} isAnnouncement={isAnnouncement} />;
  }

  return (
    <div className="flex-1 relative min-h-0">
      <Virtuoso
        ref={virtuosoRef}
        className="h-full [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 [&::-webkit-scrollbar-thumb:hover]:bg-border/60 [&::-webkit-scrollbar-track]:bg-transparent"
        data={items}
        followOutput={atBottom ? "smooth" : false}
        atBottomStateChange={(bottom) => { setAtBottom(bottom); setShowScrollBtn(!bottom); }}
        startReached={handleLoadMore}
        itemContent={(index, item) => {
          const { message, sameAuthor, replied, showDateSep } = item;
          return (
            <div>
              {showDateSep && (
                <div className="flex items-center gap-3 my-4 px-5">
                  <div className="flex-1 h-px bg-border/30" />
                  <span className="text-[11px] font-semibold text-muted-foreground/40 uppercase tracking-wider shrink-0">
                    {getDateLabel(message.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-border/30" />
                </div>
              )}
              <div className="px-2 sm:px-5">
                <MessageItem
                  message={message}
                  sameAuthor={sameAuthor}
                  replied={replied}
                  reactions={reactions}
                  isTemp={message.status === "sending"}
                  onReact={onReact}
                  onDelete={onDelete}
                  onSaveEdit={onSaveEdit}
                  onTogglePin={onTogglePin}
                />
              </div>
            </div>
          );
        }}
        components={{
          Header: hasMore ? () => (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground/60">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          ) : undefined,
        }}
      />

      {showScrollBtn && (
        <button onClick={handleScrollToBottom}
          className="absolute bottom-4 right-6 h-10 w-10 rounded-full bg-primary shadow-lg shadow-primary/30 grid place-items-center hover:bg-primary/90 transition-all z-10 touch-manipulation">
          <svg className="h-5 w-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </button>
      )}
    </div>
  );
}
