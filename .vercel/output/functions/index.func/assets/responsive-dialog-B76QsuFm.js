import { jsx, jsxs } from "react/jsx-runtime";
import * as React from "react";
import { D as Dialog, e as DialogTrigger, a as DialogContent, c as DialogHeader, d as DialogTitle, b as DialogDescription } from "./dialog-BzLIvjno.js";
import { Drawer as Drawer$1 } from "vaul";
import { c as cn } from "./button-DjOZMqFS.js";
const MOBILE_BREAKPOINT = 768;
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(void 0);
  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
const Drawer = ({
  shouldScaleBackground = true,
  ...props
}) => /* @__PURE__ */ jsx(Drawer$1.Root, { shouldScaleBackground, ...props });
Drawer.displayName = "Drawer";
const DrawerTrigger = Drawer$1.Trigger;
const DrawerPortal = Drawer$1.Portal;
Drawer$1.Close;
const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Drawer$1.Overlay,
  {
    ref,
    className: cn("fixed inset-0 z-50 bg-black/80", className),
    ...props
  }
));
DrawerOverlay.displayName = Drawer$1.Overlay.displayName;
const DrawerContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DrawerPortal, { children: [
  /* @__PURE__ */ jsx(DrawerOverlay, {}),
  /* @__PURE__ */ jsxs(
    Drawer$1.Content,
    {
      ref,
      className: cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      ),
      ...props,
      children: [
        /* @__PURE__ */ jsx("div", { className: "mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" }),
        children
      ]
    }
  )
] }));
DrawerContent.displayName = "DrawerContent";
const DrawerHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("grid gap-1.5 p-4 text-center sm:text-left", className), ...props });
DrawerHeader.displayName = "DrawerHeader";
const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Drawer$1.Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DrawerTitle.displayName = Drawer$1.Title.displayName;
const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  Drawer$1.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DrawerDescription.displayName = Drawer$1.Description.displayName;
function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
  contentClassName
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return /* @__PURE__ */ jsxs(Drawer, { open, onOpenChange, children: [
      trigger && /* @__PURE__ */ jsx(DrawerTrigger, { asChild: true, children: trigger }),
      /* @__PURE__ */ jsxs(DrawerContent, { className: `border-t border-border/50 bg-background/95 backdrop-blur-xl ${className ?? ""}`, children: [
        /* @__PURE__ */ jsxs(DrawerHeader, { className: "text-left border-b border-border/30 pb-3", children: [
          title && /* @__PURE__ */ jsx(DrawerTitle, { className: "text-base", children: title }),
          /* @__PURE__ */ jsx(DrawerDescription, { className: "sr-only", children: description || title || "Diálogo" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: `px-4 pb-8 max-h-[70dvh] overflow-y-auto ${contentClassName ?? ""}`, children })
      ] })
    ] });
  }
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange, children: [
    trigger && /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: trigger }),
    /* @__PURE__ */ jsxs(DialogContent, { className: `bg-background/95 backdrop-blur-xl border-border/50 ${className ?? ""}`, children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        title && /* @__PURE__ */ jsx(DialogTitle, { children: title }),
        /* @__PURE__ */ jsx(DialogDescription, { className: "sr-only", children: description || title || "Diálogo" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: contentClassName, children })
    ] })
  ] });
}
export {
  ResponsiveDialog as R
};
