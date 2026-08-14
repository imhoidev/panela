import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { useState } from "react";
import { D as Dialog, a as DialogContent } from "./dialog-BzLIvjno.js";
import { X, Download, ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
function MediaLightbox({
  items,
  initialIndex = 0,
  open,
  onOpenChange
}) {
  const [idx, setIdx] = useState(initialIndex);
  const current = items[idx];
  if (!current) return null;
  const isImage = current.type?.startsWith("image/");
  const isVideo = current.type?.startsWith("video/");
  const isAudio = current.type?.startsWith("audio/");
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsx(DialogContent, { className: "max-w-[90vw] max-h-[90vh] p-0 bg-black/95 backdrop-blur-2xl border-0 overflow-hidden shadow-2xl", children: /* @__PURE__ */ jsxs("div", { className: "relative flex items-center justify-center w-full min-h-[50vh]", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => onOpenChange(false),
        className: "absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors",
        children: /* @__PURE__ */ jsx(X, { className: "h-5 w-5" })
      }
    ),
    /* @__PURE__ */ jsx(
      "a",
      {
        href: current.url,
        download: true,
        onClick: (e) => e.stopPropagation(),
        className: "absolute top-3 right-14 z-10 h-9 w-9 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors",
        title: "Download",
        children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" })
      }
    ),
    items.length > 1 && idx > 0 && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setIdx((i) => i - 1),
        className: "absolute left-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors",
        children: /* @__PURE__ */ jsx(ChevronLeft, { className: "h-6 w-6" })
      }
    ),
    items.length > 1 && idx < items.length - 1 && /* @__PURE__ */ jsx(
      "button",
      {
        onClick: () => setIdx((i) => i + 1),
        className: "absolute right-3 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white/10 grid place-items-center text-white/80 hover:bg-white/20 hover:text-white transition-colors",
        children: /* @__PURE__ */ jsx(ChevronRight, { className: "h-6 w-6" })
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "w-full h-full flex items-center justify-center p-4", children: isImage ? /* @__PURE__ */ jsx("img", { src: current.url, alt: "", className: "max-w-full max-h-[80vh] rounded-lg object-contain shadow-2xl" }) : isVideo ? /* @__PURE__ */ jsx("video", { src: current.url, controls: true, className: "max-w-full max-h-[80vh] rounded-lg", autoPlay: true, playsInline: true }) : isAudio ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4 text-white/80", children: [
      /* @__PURE__ */ jsx("div", { className: "h-24 w-24 rounded-full bg-white/10 grid place-items-center", children: /* @__PURE__ */ jsx(Paperclip, { className: "h-10 w-10" }) }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-medium truncate max-w-[300px]", children: current.url.split("/").pop() }),
      /* @__PURE__ */ jsx("audio", { src: current.url, controls: true, className: "w-full max-w-sm", autoPlay: true })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-4 text-white/80", children: [
      /* @__PURE__ */ jsx("div", { className: "h-24 w-24 rounded-full bg-white/10 grid place-items-center", children: /* @__PURE__ */ jsx(Paperclip, { className: "h-10 w-10" }) }),
      /* @__PURE__ */ jsx("p", { className: "text-lg font-medium truncate max-w-[300px]", children: current.url.split("/").pop() }),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: current.url,
          download: true,
          className: "px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium",
          children: "Baixar arquivo"
        }
      )
    ] }) }),
    items.length > 1 && /* @__PURE__ */ jsxs("div", { className: "absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs", children: [
      idx + 1,
      " / ",
      items.length
    ] })
  ] }) }) });
}
function MediaAttachment({ url, type, children }) {
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: () => setOpen(true),
        className: "block text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-lg",
        children
      }
    ),
    /* @__PURE__ */ jsx(MediaLightbox, { items: [{ url, type }], open, onOpenChange: setOpen })
  ] });
}
export {
  MediaAttachment as M
};
