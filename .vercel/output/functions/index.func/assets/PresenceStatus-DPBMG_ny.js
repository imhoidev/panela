import { jsx, jsxs } from "react/jsx-runtime";
import { u as useRealtimeSocket } from "./useRealtime-BsjksZbg.js";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { ChevronRight, Check, Circle, MessageSquare } from "lucide-react";
import { c as cn } from "./button-DjOZMqFS.js";
import { I as Input } from "./input-D_U8fI25.js";
function useIdle(timeoutMs = 3e5) {
  const [idle, setIdle] = useState(false);
  const timer = useRef(null);
  useEffect(() => {
    function reset() {
      setIdle(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), timeoutMs);
    }
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "wheel", "scroll"];
    events.forEach((e) => window.addEventListener(e, reset));
    reset();
    return () => {
      clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [timeoutMs]);
  return idle;
}
const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuSubTrigger = React.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.SubTrigger,
  {
    ref,
    className: cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(ChevronRight, { className: "ml-auto" })
    ]
  }
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;
const DropdownMenuSubContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.SubContent,
  {
    ref,
    className: cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className
    ),
    ...props
  }
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(DropdownMenuPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Item,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
      inset && "pl-8",
      className
    ),
    ...props
  }
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuCheckboxItem = React.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.CheckboxItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    checked,
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Check, { className: "h-4 w-4" }) }) }),
      children
    ]
  }
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;
const DropdownMenuRadioItem = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(
  DropdownMenuPrimitive.RadioItem,
  {
    ref,
    className: cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    ),
    ...props,
    children: [
      /* @__PURE__ */ jsx("span", { className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center", children: /* @__PURE__ */ jsx(DropdownMenuPrimitive.ItemIndicator, { children: /* @__PURE__ */ jsx(Circle, { className: "h-2 w-2 fill-current" }) }) }),
      children
    ]
  }
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;
const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Label,
  {
    ref,
    className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
    ...props
  }
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DropdownMenuPrimitive.Separator,
  {
    ref,
    className: cn("-mx-1 my-1 h-px bg-muted", className),
    ...props
  }
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
const STATUS_LABELS = {
  online: "Online",
  idle: "Ausente",
  dnd: "Ocupado",
  invisible: "Invisível"
};
const STATUS_COLORS = {
  online: "text-emerald-500",
  idle: "text-yellow-500",
  dnd: "text-red-500",
  invisible: "text-muted-foreground/50"
};
const STATUS_DOTS = {
  online: "bg-emerald-500",
  idle: "bg-yellow-500",
  dnd: "bg-red-500",
  invisible: "bg-muted-foreground/30"
};
function StatusDot({ status, size = "sm" }) {
  const s = size === "lg" ? "h-3 w-3" : size === "md" ? "h-2.5 w-2.5" : "h-2 w-2";
  const dot = STATUS_DOTS[status] || STATUS_DOTS.invisible;
  return /* @__PURE__ */ jsx("span", { className: `inline-block ${s} rounded-full ${dot} border-2 border-card`, title: STATUS_LABELS[status] || "Offline" });
}
function StatusPicker({ currentStatus, statusText: initialText, onSet }) {
  const { user } = useAuth();
  const { emit } = useRealtimeSocket();
  const [statusText, setStatusText] = useState(initialText ?? "");
  const [editingText, setEditingText] = useState(false);
  async function setStatus(status) {
    if (!user) return;
    await supabase.from("profiles").update({ status }).eq("id", user.id);
    emit("presence:set", status);
    onSet?.(status);
  }
  async function saveStatusText() {
    if (!user) return;
    await supabase.from("profiles").update({ status_text: statusText.trim() || null }).eq("id", user.id);
    setEditingText(false);
  }
  const idle = useIdle(5 * 60 * 1e3);
  useEffect(() => {
    if (idle && currentStatus === "online") {
      setStatus("idle");
    }
  }, [idle]);
  return /* @__PURE__ */ jsxs(DropdownMenu, { children: [
    /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs("button", { className: "flex items-center gap-1.5 text-xs hover:text-foreground transition-colors", children: [
      /* @__PURE__ */ jsx(StatusDot, { status: currentStatus || "online", size: "sm" }),
      /* @__PURE__ */ jsx("span", { className: "hidden sm:inline text-muted-foreground", children: STATUS_LABELS[currentStatus || "online"] })
    ] }) }),
    /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "start", className: "w-52", children: [
      ["online", "idle", "dnd", "invisible"].map((s) => /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => setStatus(s), className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Circle, { className: `h-3.5 w-3.5 fill-current ${STATUS_COLORS[s]}` }),
        /* @__PURE__ */ jsx("span", { className: "flex-1", children: STATUS_LABELS[s] }),
        (currentStatus || "online") === s && /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" })
      ] }, s)),
      /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
      /* @__PURE__ */ jsxs("div", { className: "px-2 py-1.5", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-xs text-muted-foreground mb-1", children: [
          /* @__PURE__ */ jsx(MessageSquare, { className: "h-3 w-3" }),
          /* @__PURE__ */ jsx("span", { children: "Status personalizado" })
        ] }),
        editingText ? /* @__PURE__ */ jsxs("div", { className: "flex gap-1", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              value: statusText,
              onChange: (e) => setStatusText(e.target.value),
              maxLength: 64,
              placeholder: "O que está acontecendo?",
              className: "h-7 text-xs flex-1",
              onKeyDown: (e) => {
                if (e.key === "Enter") saveStatusText();
                if (e.key === "Escape") setEditingText(false);
              }
            }
          ),
          /* @__PURE__ */ jsx("button", { onClick: saveStatusText, className: "h-7 w-7 rounded grid place-items-center hover:bg-accent text-primary", children: /* @__PURE__ */ jsx(Check, { className: "h-3.5 w-3.5" }) })
        ] }) : /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setEditingText(true),
            className: "w-full text-left text-xs text-muted-foreground/60 hover:text-foreground py-1 rounded px-1 hover:bg-accent/50 transition-colors",
            children: initialText ? /* @__PURE__ */ jsxs("span", { className: "italic", children: [
              "“",
              initialText,
              "”"
            ] }) : "Adicionar status..."
          }
        )
      ] }),
      /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
      /* @__PURE__ */ jsx("p", { className: "px-2 py-1 text-[10px] text-muted-foreground", children: "Ausente automático após 5 min" })
    ] })
  ] });
}
export {
  StatusDot as S,
  StatusPicker as a
};
