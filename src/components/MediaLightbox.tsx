import { useState, type ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Download, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";

type MediaItem = {
  url: string;
  type: string | null;
};

export function MediaLightbox({
  items, initialIndex = 0, open, onOpenChange,
}: {
  items: MediaItem[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [idx, setIdx] = useState(initialIndex);
  const current = items[idx];
  if (!current) return null;

  const isImage = current.type?.startsWith("image/");
  const isVideo = current.type?.startsWith("video/");
  const isAudio = current.type?.startsWith("audio/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 backdrop-blur-2xl border-0 overflow-hidden shadow-2xl">
        <div className="relative flex items-center justify-center w-full min-h-[50vh]">
          <button onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>

          <a href={current.url} download onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-14 z-10 h-9 w-9 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors"
            title="Download">
            <Download className="h-4 w-4" />
          </a>

          {items.length > 1 && idx > 0 && (
            <button onClick={() => setIdx((i) => i - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {items.length > 1 && idx < items.length - 1 && (
            <button onClick={() => setIdx((i) => i + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors">
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <div className="w-full h-full flex items-center justify-center p-4">
            {isImage ? (
              <img src={current.url} alt="" className="max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl" />
            ) : isVideo ? (
              <video src={current.url} controls className="max-w-full max-h-[80vh] rounded-lg" autoPlay playsInline />
            ) : isAudio ? (
              <div className="flex flex-col items-center gap-4 text-white/80">
                <div className="h-24 w-24 rounded-full bg-white/10 grid place-items-center">
                  <Paperclip className="h-10 w-10" />
                </div>
                <p className="text-lg font-medium truncate max-w-[300px]">{current.url.split("/").pop()}</p>
                <audio src={current.url} controls className="w-full max-w-sm" autoPlay />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 text-white/80">
                <div className="h-24 w-24 rounded-full bg-white/10 grid place-items-center">
                  <Paperclip className="h-10 w-10" />
                </div>
                <p className="text-lg font-medium truncate max-w-[300px]">{current.url.split("/").pop()}</p>
                <a href={current.url} download
                  className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium">
                  Baixar arquivo
                </a>
              </div>
            )}
          </div>

          {items.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs">
              {idx + 1} / {items.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MediaAttachment({ url, type, children }: { url: string; type: string | null; children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="block text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg">
        {children}
      </button>
      <MediaLightbox items={[{ url, type }]} open={open} onOpenChange={setOpen} />
    </>
  );
}
