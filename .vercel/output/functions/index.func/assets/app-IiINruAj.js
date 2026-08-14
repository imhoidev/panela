import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useRouter, useLocation, Link, Outlet } from "@tanstack/react-router";
import { u as useAuth, s as supabase, b as isStaff } from "./router-BokS3urV.js";
import { P as PanelaLogo } from "./PanelaLogo-DrUIuaWG.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { c as cn, B as Button } from "./button-DjOZMqFS.js";
import { S as Sheet, e as SheetTrigger, a as SheetContent, c as SheetHeader, d as SheetTitle, b as SheetDescription } from "./sheet-DQ5cLgT7.js";
import { S as ScrollArea } from "./scroll-area-JK6xafWT.js";
import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { a as StatusPicker } from "./PresenceStatus-DPBMG_ny.js";
import { Menu, Search, Home, Hash, MessageSquare, Compass, Settings, Users, Sparkles, Crown, LogOut, Circle, Plus } from "lucide-react";
import { R as RequireAuth } from "./AuthGate-C8DikIZp.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "@radix-ui/react-avatar";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-dialog";
import "@radix-ui/react-scroll-area";
import "./useRealtime-BsjksZbg.js";
import "socket.io-client";
import "@radix-ui/react-dropdown-menu";
import "./input-D_U8fI25.js";
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  TooltipPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const NAV = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/servers", label: "Panelas", icon: Hash },
  { to: "/app/dms", label: "DMs", icon: MessageSquare },
  { to: "/app/discover", label: "Descobrir", icon: Compass },
  { to: "/app/profile", label: "Perfil", icon: Users },
  { to: "/app/plans", label: "Planos", icon: Sparkles },
  { to: "/app/settings", label: "Ajustes", icon: Settings }
];
const BOTTOM_NAV = [
  { to: "/app", label: "Início", icon: Home },
  { to: "/app/servers", label: "Panelas", icon: Hash },
  { to: "/app/dms", label: "DMs", icon: MessageSquare },
  { to: "/app/discover", label: "+", icon: Compass },
  { to: "/app/settings", label: "Ajustes", icon: Settings }
];
function AppShell({ children }) {
  const { user, profile, roles, signOut } = useAuth();
  const router = useRouter();
  const loc = useLocation();
  const [myServers, setMyServers] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [memberPanelOpen, setMemberPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadServers = useCallback(async () => {
    if (!user) return;
    const { data: mem } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
    const ids = (mem ?? []).map((m) => m.server_id);
    if (!ids.length) {
      setMyServers([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from("servers").select("id,name,icon_url").in("id", ids);
    setMyServers(data ?? []);
    setLoading(false);
  }, [user]);
  useEffect(() => {
    if (!user) return;
    loadServers();
    const ch = supabase.channel(`my-servers-${user.id}`).on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, loadServers).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, loadServers]);
  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);
  if (!user) return /* @__PURE__ */ jsx("div", { className: "min-h-screen", children });
  const activeServerId = loc.pathname.startsWith("/app/servers/") ? loc.pathname.split("/")[3] : null;
  const hideBottomNav = loc.pathname.match(/^\/app\/servers\/[^/]+\/[^/]+$/) || loc.pathname.match(/^\/app\/dms\/[^/]+$/);
  return /* @__PURE__ */ jsxs("div", { className: "h-[100dvh] w-screen overflow-hidden flex bg-background text-foreground", children: [
    /* @__PURE__ */ jsx(ServersRail, { myServers, activeServerId, loc, loading }),
    /* @__PURE__ */ jsx("aside", { className: "hidden lg:flex w-60 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-md shrink-0", children: /* @__PURE__ */ jsx(NavBlock, { profile, roles, loc, onSignOut: async () => {
      await signOut();
      router.navigate({ to: "/auth/login" });
    } }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0 min-h-0 flex flex-col relative", children: [
      /* @__PURE__ */ jsxs("header", { className: "lg:hidden flex items-center gap-2 h-12 px-2 border-b border-border/60 bg-sidebar/90 backdrop-blur-md pt-[max(env(safe-area-inset-top),0.25rem)] shrink-0 z-20", children: [
        /* @__PURE__ */ jsxs(Sheet, { open: mobileOpen, onOpenChange: setMobileOpen, children: [
          /* @__PURE__ */ jsx(SheetTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", className: "h-10 w-10 touch-manipulation", children: /* @__PURE__ */ jsx(Menu, { className: "h-5 w-5" }) }) }),
          /* @__PURE__ */ jsxs(SheetContent, { side: "left", className: "p-0 w-[85vw] max-w-[320px] bg-sidebar/95 backdrop-blur-xl flex flex-col", children: [
            /* @__PURE__ */ jsxs(SheetHeader, { className: "sr-only", children: [
              /* @__PURE__ */ jsx(SheetTitle, { children: "Menu" }),
              /* @__PURE__ */ jsx(SheetDescription, { children: "Navegação principal e suas panelas." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex h-full min-h-0", children: [
              /* @__PURE__ */ jsx("div", { className: "w-[60px] border-r border-sidebar-border bg-sidebar/60 py-2 overflow-y-auto shrink-0", children: /* @__PURE__ */ jsx(ServersRailInner, { myServers, activeServerId, loc, compact: true, loading }) }),
              /* @__PURE__ */ jsx("div", { className: "flex-1 min-w-0 flex flex-col", children: /* @__PURE__ */ jsx(NavBlock, { profile, roles, loc, onSignOut: async () => {
                await signOut();
                router.navigate({ to: "/auth/login" });
              } }) })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs(Link, { to: "/app", className: "flex-1 min-w-0 truncate flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(PanelaLogo, { size: 20 }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-muted-foreground/60 font-medium" })
        ] }),
        /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", className: "h-10 w-10 touch-manipulation", asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/app/discover", children: /* @__PURE__ */ jsx(Search, { className: "h-5 w-5" }) }) })
      ] }),
      /* @__PURE__ */ jsx("main", { className: "flex-1 min-w-0 min-h-0 overflow-hidden", children }),
      !hideBottomNav && /* @__PURE__ */ jsx("nav", { className: "lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-sidebar/90 backdrop-blur-lg pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-2xl shadow-black/40", children: /* @__PURE__ */ jsx("ul", { className: "grid grid-cols-5 h-14", children: BOTTOM_NAV.map((it) => {
        const active = loc.pathname === it.to || it.to !== "/app" && loc.pathname.startsWith(it.to);
        return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, { to: it.to, className: `flex flex-col items-center justify-center h-full text-[10px] gap-0.5 transition-colors touch-manipulation ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`, children: [
          /* @__PURE__ */ jsx(it.icon, { className: `h-5 w-5 ${active ? "fill-primary/10" : ""}` }),
          /* @__PURE__ */ jsx("span", { children: it.label })
        ] }) }, it.to);
      }) }) })
    ] })
  ] });
}
function NavBlock({
  profile,
  roles,
  loc,
  onSignOut
}) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { className: "p-4 border-b border-sidebar-border hidden lg:flex items-center", children: /* @__PURE__ */ jsx(PanelaLogo, { size: 22 }) }),
    /* @__PURE__ */ jsx(ScrollArea, { className: "flex-1 py-2", children: /* @__PURE__ */ jsxs("nav", { className: "px-2 space-y-0.5", children: [
      NAV.map((it) => {
        const active = loc.pathname === it.to || it.to !== "/app" && loc.pathname.startsWith(it.to);
        return /* @__PURE__ */ jsxs(
          Link,
          {
            to: it.to,
            className: `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`,
            children: [
              /* @__PURE__ */ jsx(it.icon, { className: "h-4 w-4 shrink-0" }),
              it.label
            ]
          },
          it.to
        );
      }),
      isStaff(roles) && /* @__PURE__ */ jsxs(
        Link,
        {
          to: "/app/admin",
          className: `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${loc.pathname.startsWith("/app/admin") ? "bg-primary/15 text-primary font-medium" : "text-primary/80 hover:bg-primary/10"}`,
          children: [
            /* @__PURE__ */ jsx(Crown, { className: "h-4 w-4 shrink-0" }),
            " Painel Staff"
          ]
        }
      )
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: "shrink-0 p-2 border-t border-sidebar-border", children: /* @__PURE__ */ jsxs(
      Link,
      {
        to: { to: "/app/u/$slug", params: { slug: profile?.username ?? "" } },
        className: "flex items-center gap-2.5 rounded-lg px-3 py-2.5 min-h-[3.25rem] hover:bg-sidebar-accent/40 transition-colors",
        children: [
          /* @__PURE__ */ jsxs(Avatar, { className: "h-9 w-9 shrink-0 ring-2 ring-border/20", children: [
            /* @__PURE__ */ jsx(AvatarImage, { src: profile?.avatar_url ?? void 0 }),
            /* @__PURE__ */ jsx(AvatarFallback, { children: profile?.username?.[0]?.toUpperCase() ?? "?" })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx("span", { className: "truncate text-sm font-medium", children: profile?.display_name || profile?.username }),
              /* @__PURE__ */ jsx(StatusPicker, { currentStatus: profile?.status })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "truncate text-xs text-muted-foreground", children: [
              "@",
              profile?.username
            ] })
          ] }),
          /* @__PURE__ */ jsx(Button, { size: "icon", variant: "ghost", onClick: (e) => {
            e.preventDefault();
            onSignOut();
          }, title: "Sair", className: "h-8 w-8 shrink-0", children: /* @__PURE__ */ jsx(LogOut, { className: "h-4 w-4" }) })
        ]
      }
    ) })
  ] });
}
function ServersRail({ myServers, activeServerId, loc, loading }) {
  return /* @__PURE__ */ jsx("aside", { className: "hidden md:flex w-[72px] flex-col items-center gap-2 border-r border-sidebar-border bg-sidebar py-3 overflow-y-auto shrink-0", children: /* @__PURE__ */ jsx(ServersRailInner, { myServers, activeServerId, loc, loading }) });
}
function ServerIcon({ s, active, size }) {
  return /* @__PURE__ */ jsxs("div", { className: `relative grid place-items-center overflow-hidden font-bold transition-all duration-300 shadow-sm ${size} ${active ? "rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "rounded-2xl bg-sidebar-accent/70 hover:rounded-xl hover:bg-primary/80 text-muted-foreground hover:text-primary-foreground"}`, children: [
    active && /* @__PURE__ */ jsx("span", { className: "absolute -left-2.5 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full shadow-sm shadow-primary/40" }),
    s.icon_url ? /* @__PURE__ */ jsx("img", { src: s.icon_url, alt: "", className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx("span", { className: size === "h-10 w-10" ? "text-sm" : "text-base", children: s.name[0]?.toUpperCase() })
  ] });
}
function ServersRailInner({
  myServers,
  activeServerId,
  loc,
  compact,
  loading
}) {
  const size = compact ? "h-10 w-10" : "h-12 w-12";
  const homeActive = loc.pathname === "/app";
  return /* @__PURE__ */ jsx(TooltipProvider, { delayDuration: 0, children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2 w-full", children: [
    /* @__PURE__ */ jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
        Link,
        {
          to: "/app",
          className: `grid place-items-center font-bold transition-all duration-300 shadow-sm ${size} ${homeActive ? "rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "rounded-2xl bg-sidebar-accent/70 hover:rounded-xl hover:bg-primary/80 text-muted-foreground hover:text-primary-foreground"}`,
          children: /* @__PURE__ */ jsx("span", { className: compact ? "text-sm" : "text-base", children: "P" })
        }
      ) }),
      /* @__PURE__ */ jsx(TooltipContent, { side: "right", className: "text-xs", children: "Início" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-px w-8 bg-sidebar-border" }),
    loading ? /* @__PURE__ */ jsx(Fragment, { children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx("div", { className: `${size} rounded-2xl bg-sidebar-accent/30 animate-pulse` }, i)) }) : myServers.map((s) => {
      const active = activeServerId === s.id;
      return /* @__PURE__ */ jsxs(Tooltip, { children: [
        /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Link, { to: "/app/servers/$serverId", params: { serverId: s.id }, children: /* @__PURE__ */ jsx(ServerIcon, { s, active, size }) }) }),
        /* @__PURE__ */ jsx(TooltipContent, { side: "right", className: "text-xs font-medium", sideOffset: 8, children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5", children: [
          s.name,
          active && /* @__PURE__ */ jsx(Circle, { className: "h-1.5 w-1.5 fill-primary" })
        ] }) })
      ] }, s.id);
    }),
    /* @__PURE__ */ jsxs(Tooltip, { children: [
      /* @__PURE__ */ jsx(TooltipTrigger, { asChild: true, children: /* @__PURE__ */ jsx(
        Link,
        {
          to: "/app/servers",
          className: `grid place-items-center rounded-2xl bg-sidebar-accent/70 text-primary hover:rounded-xl hover:bg-primary/20 hover:text-primary transition-all duration-300 ${size} shadow-sm`,
          children: /* @__PURE__ */ jsx(Plus, { className: "h-5 w-5" })
        }
      ) }),
      /* @__PURE__ */ jsx(TooltipContent, { side: "right", className: "text-xs", children: "Nova panela" })
    ] })
  ] }) });
}
const SplitComponent = () => /* @__PURE__ */ jsx(RequireAuth, { children: /* @__PURE__ */ jsx(AppShell, { children: /* @__PURE__ */ jsx(Outlet, {}) }) });
export {
  SplitComponent as component
};
