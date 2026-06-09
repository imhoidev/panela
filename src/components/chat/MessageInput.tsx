import { useRef, useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GifPicker } from "@/components/GifPicker";
import { StickerPicker } from "@/components/StickerPicker";
import { useChatContext } from "./ChatContext";
import {
  Paperclip, Smile, SendHorizontal, CornerUpLeft, X, Shield, Upload,
} from "lucide-react";

type Props = {
  channelName: string;
  sending: boolean;
  uploading: boolean;
  canPost: boolean;
  isAnnouncement?: boolean;
  isRules?: boolean;
  serverId: string;
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onUploadFile: (file: File) => void;
  onInsertGif: (url: string) => void;
  onInsertSticker: (url: string) => void;
  onEmitTyping: () => void;
};

export function MessageInput({
  channelName, sending, uploading, canPost,
  isAnnouncement, isRules, serverId,
  text, onTextChange, onSubmit, onUploadFile,
  onInsertGif, onInsertSticker, onEmitTyping,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const { replyTo, cancelReply } = useChatContext();
  const [dragging, setDragging] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  // Debounced typing
  const emitTypingDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    onEmitTyping();
    debounceRef.current = setTimeout(() => {}, 300);
  }, [onEmitTyping]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  // Drag & drop
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
    const onDragLeave = (e: DragEvent) => {
      if (e.relatedTarget && (e.relatedTarget as Node).parentNode === document.body) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) onUploadFile(f);
    };
    document.addEventListener("dragenter", onDragEnter);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("dragleave", onDragLeave);
    document.addEventListener("drop", onDrop);
    return () => {
      document.removeEventListener("dragenter", onDragEnter);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("dragleave", onDragLeave);
      document.removeEventListener("drop", onDrop);
    };
  }, [onUploadFile]);

  if (isRules || isAnnouncement) {
    return (
      <div className="px-2 sm:px-5 pb-2 sm:pb-3 pt-1 border-t border-border/50 bg-card/10 shrink-0">
        {canPost ? (
          <form onSubmit={onSubmit}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { onTextChange(e.target.value); }}
              placeholder={`Mensagem em #${channelName}`}
              className="w-full bg-card/80 backdrop-blur rounded-xl border border-border/70 h-10 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus-visible:border-primary/40 resize-none outline-none"
              maxLength={2000}
              rows={1}
            />
          </form>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card/50 border border-border/50 text-xs text-muted-foreground/60">
            <Shield className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            <span>{isAnnouncement ? "Apenas moderadores podem publicar anuncios." : "Apenas moderadores podem comentar sobre as regras."}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {dragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-primary/50 m-2">
          <div className="flex flex-col items-center gap-3 text-primary/70">
            <Upload className="h-10 w-10" />
            <p className="text-lg font-semibold">Solte os arquivos aqui</p>
            <p className="text-sm text-muted-foreground/60">para enviar para #{channelName}</p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="px-2 sm:px-5 pb-2 sm:pb-3 pt-1 border-t border-border/50 bg-card/10 pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0 relative">
        {replyTo && (
          <div className="mb-1.5 text-xs flex items-center justify-between px-3 py-1.5 rounded-lg bg-accent/20 border border-border/60">
            <span className="truncate flex items-center gap-1.5">
              <CornerUpLeft className="inline h-3 w-3 shrink-0 text-primary/60" />
              <span className="text-muted-foreground/70">respondendo</span>
              <span className="font-medium text-foreground/80">@{replyTo.author?.username ?? "alguém"}</span>
              <span className="text-muted-foreground/50 hidden sm:inline truncate">: {replyTo.content}</span>
            </span>
            <button type="button" onClick={cancelReply} className="p-1 hover:text-foreground text-muted-foreground/50 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-1.5 bg-card/80 backdrop-blur rounded-xl border border-border/70 px-2 py-1.5 shadow-sm shadow-black/10 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <input type="file" ref={fileRef} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); e.target.value = ""; }} />
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
            className="text-muted-foreground/50 hover:text-foreground disabled:opacity-30 p-1.5 shrink-0 transition-colors self-end mb-0.5" title="Anexar arquivo">
            <Paperclip className="h-5 w-5" />
          </button>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-foreground text-xs font-bold px-2 h-8 shrink-0 transition-colors self-end mb-0.5">GIF</button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-2" align="start">
              <GifPicker onSelect={onInsertGif} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground/50 hover:text-foreground p-1.5 shrink-0 transition-colors self-end mb-0.5">
                <Smile className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-2" align="start">
              <StickerPicker onSelect={onInsertSticker} serverId={serverId} />
            </PopoverContent>
          </Popover>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { onTextChange(e.target.value); emitTypingDebounced(); }}
            placeholder={`Mensagem em #${channelName}`}
            className="bg-transparent border-0 flex-1 min-w-0 px-1.5 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/40 resize-none outline-none max-h-[160px]"
            maxLength={2000}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(e); }
            }}
          />
          <button type="submit" disabled={!text.trim() || sending}
            className="text-primary/60 hover:text-primary disabled:opacity-25 p-1.5 shrink-0 transition-colors disabled:cursor-not-allowed self-end mb-0.5"
            title="Enviar (Enter)">
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </form>
    </>
  );
}
