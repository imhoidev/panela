import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useNavigate, createRootRouteWithContext, useRouter, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect, createContext, useContext, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { Toaster as Toaster$1 } from "sonner";
import { Search, Command, Users, Hash, MessageSquare, ArrowRight } from "lucide-react";
const appCss = "/assets/styles-CNciuGri.css";
function createSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...!SUPABASE_URL ? ["SUPABASE_URL"] : [],
      ...!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Please configure your environment variables.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : void 0,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Custom lock bypass to prevent browser Navigator LockManager acquisition failures
      lock: async (_name, _acquireTimeout, fn) => {
        return await fn();
      }
    }
  });
}
let _supabase;
const supabase = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  }
});
const Ctx = createContext(void 0);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [ready, setReady] = useState(false);
  async function loadProfileAndRoles(uid) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid)
    ]);
    setProfile(p ?? null);
    setRoles((r ?? []).map((x) => x.role));
  }
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfileAndRoles(s.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfileAndRoles(data.session.user.id);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return /* @__PURE__ */ jsx(
    Ctx.Provider,
    {
      value: {
        user,
        session,
        profile,
        roles,
        ready,
        refreshProfile: async () => {
          if (user) await loadProfileAndRoles(user.id);
        },
        signOut: async () => {
          await supabase.auth.signOut();
        }
      },
      children
    }
  );
}
function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
const isStaff = (roles) => roles.some((r) => r === "admin" || r === "coo" || r === "ceo");
const isCeo = (roles) => roles.includes("ceo");
const isCooOrAbove = (roles) => roles.includes("ceo") || roles.includes("coo");
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  useEffect(() => {
    const down = (e) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else {
      setQuery("");
      setResults([]);
      setIdx(0);
    }
  }, [open]);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.trim().toLowerCase();
    setLoading(true);
    const timer = setTimeout(async () => {
      const all = [];
      const { data: servers } = await supabase.from("servers").select("id,name").ilike("name", `%${q}%`).limit(5);
      for (const s of servers ?? []) all.push({ type: "server", id: s.id, label: s.name, sublabel: "Servidor", to: `/app/servers/${s.id}` });
      const { data: channels } = await supabase.from("channels").select("id,name,server_id").ilike("name", `%${q}%`).limit(5);
      for (const c of channels ?? []) all.push({ type: "channel", id: c.id, label: `#${c.name}`, sublabel: "Canal", to: `/app/servers/${c.server_id}/${c.id}` });
      setResults(all);
      setIdx(0);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);
  const go = useCallback((r) => {
    setOpen(false);
    navigate({ to: r.to });
  }, [navigate]);
  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[idx]) go(results[idx]);
  };
  if (!open) return null;
  return /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex items-start justify-center pt-[15vh]", onClick: () => setOpen(false), children: [
    /* @__PURE__ */ jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm" }),
    /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 px-4 border-b border-border", children: [
        /* @__PURE__ */ jsx(Search, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: inputRef,
            value: query,
            onChange: (e) => setQuery(e.target.value),
            onKeyDown: onKey,
            placeholder: "Buscar servidores, canais…",
            className: "flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          }
        ),
        /* @__PURE__ */ jsxs("kbd", { className: "hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground", children: [
          /* @__PURE__ */ jsx(Command, { className: "h-3 w-3" }),
          "K"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "max-h-80 overflow-auto p-2", children: [
        loading && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground px-2 py-4 text-center", children: "Buscando…" }),
        !loading && results.length === 0 && query && /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground px-2 py-4 text-center", children: "Nada encontrado" }),
        results.map((r, i) => /* @__PURE__ */ jsxs(
          "button",
          {
            className: `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${i === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`,
            onClick: () => go(r),
            onMouseEnter: () => setIdx(i),
            children: [
              /* @__PURE__ */ jsx("span", { className: "shrink-0 text-muted-foreground", children: r.type === "server" ? /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" }) : r.type === "channel" ? /* @__PURE__ */ jsx(Hash, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4" }) }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("div", { className: "truncate font-medium", children: r.label }),
                /* @__PURE__ */ jsx("div", { className: "truncate text-xs text-muted-foreground", children: r.sublabel })
              ] }),
              /* @__PURE__ */ jsx(ArrowRight, { className: "h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" })
            ]
          },
          `${r.type}-${r.id}`
        ))
      ] })
    ] })
  ] });
}
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 text-xl font-semibold", children: "Página não encontrada" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "Essa panela tá vazia. Volta pro início." }),
    /* @__PURE__ */ jsx("div", { className: "mt-6", children: /* @__PURE__ */ jsx(Link, { to: "/", className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90", children: "Ir pro início" }) })
  ] }) });
}
function ErrorComponent({ error, reset }) {
  console.error(error);
  const router2 = useRouter();
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-xl font-semibold", children: "Algo entornou na panela" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: error.message }),
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex gap-2 justify-center", children: [
      /* @__PURE__ */ jsx("button", { onClick: () => {
        router2.invalidate();
        reset();
      }, className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground", children: "Tentar de novo" }),
      /* @__PURE__ */ jsx("a", { href: "/", className: "rounded-md border px-4 py-2 text-sm", children: "Início" })
    ] })
  ] }) });
}
const Route$l = createRootRouteWithContext()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PANELA — comunidades de verdade" },
      { name: "description", content: "PANELA é uma plataforma social de comunidades com vibe retrô-moderna. Crie servidores, conheça gente nova e converse em tempo real." },
      { name: "theme-color", content: "#1a120b" },
      { property: "og:title", content: "PANELA" },
      { property: "og:description", content: "Comunidades, chamadas, chat — com a calma de 2008 e a velocidade de 2026." },
      { property: "og:type", content: "website" }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/icon.png" },
      { rel: "manifest", href: "/manifest.json" }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "pt-BR", className: "dark", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);
  return null;
}
function RootComponent() {
  const { queryClient } = Route$l.useRouteContext();
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsxs(AuthProvider, { children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(SearchPalette, {}),
    /* @__PURE__ */ jsx(Toaster, { richColors: true, position: "top-right" }),
    /* @__PURE__ */ jsx(ServiceWorkerRegister, {})
  ] }) });
}
const $$splitComponentImporter$k = () => import("./auth-ChvrOYvM.js");
const Route$k = createFileRoute("/auth")({
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import("./app-BKPAezPx.js");
const Route$j = createFileRoute("/app")({
  component: lazyRouteComponent($$splitComponentImporter$j, "component")
});
const $$splitComponentImporter$i = () => import("./index-B4NL8_M2.js");
const Route$i = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component")
});
const $$splitComponentImporter$h = () => import("./index-CWrctdYq.js");
const Route$h = createFileRoute("/app/")({
  head: () => ({
    meta: [{
      title: "Início — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import("./invite._code-DGAqh_s0.js");
const Route$g = createFileRoute("/invite/$code")({
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./signup-CtDDzN3m.js");
const Route$f = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [{
      title: "Criar conta — PANELA"
    }, {
      name: "description",
      content: "Crie sua conta gratuita na PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./login-CFCt6R6c.js");
const Route$e = createFileRoute("/auth/login")({
  head: () => ({
    meta: [{
      title: "Entrar — PANELA"
    }, {
      name: "description",
      content: "Entre na PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$e, "component")
});
const $$splitComponentImporter$d = () => import("./settings-CsbQlxBL.js");
const Route$d = createFileRoute("/app/settings")({
  head: () => ({
    meta: [{
      title: "Configurações — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const $$splitComponentImporter$c = () => import("./profile-DuisKKZW.js");
const Route$c = createFileRoute("/app/profile")({
  head: () => ({
    meta: [{
      title: "Meu perfil — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const $$splitComponentImporter$b = () => import("./plans-CA8EAgTc.js");
const Route$b = createFileRoute("/app/plans")({
  head: () => ({
    meta: [{
      title: "Planos — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import("./dms-D0UOEoSp.js");
const Route$a = createFileRoute("/app/dms")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component")
});
const $$splitComponentImporter$9 = () => import("./discover-DkcrHEh7.js");
const Route$9 = createFileRoute("/app/discover")({
  head: () => ({
    meta: [{
      title: "Descobrir — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./admin-C_riYflQ.js");
const Route$8 = createFileRoute("/app/admin")({
  head: () => ({
    meta: [{
      title: "Painel Staff — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./index-DnXtQNQ8.js");
const Route$7 = createFileRoute("/app/servers/")({
  head: () => ({
    meta: [{
      title: "Meus servidores — PANELA"
    }]
  }),
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./index-BJjlS1n5.js");
const Route$6 = createFileRoute("/app/dms/")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./u._slug-CDFJFpLL.js");
const Route$5 = createFileRoute("/app/u/$slug")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./_serverId-Cw94QHj_.js");
const ServerCtx_ = createContext(null);
function useServerContext() {
  return useContext(ServerCtx_);
}
const Route$4 = createFileRoute("/app/servers/$serverId")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./s._slug-BVJ3HjYy.js");
const Route$3 = createFileRoute("/app/s/$slug")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./_conversationId-CrFHg6mq.js");
const Route$2 = createFileRoute("/app/dms/$conversationId")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./_serverId._channelId-Bx8kJrLw.js");
const Route$1 = createFileRoute("/app/servers/$serverId/$channelId")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./_messageId-Bfezj-v1.js");
const Route = createFileRoute("/app/servers/$serverId/threads/$messageId")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const AuthRoute = Route$k.update({
  id: "/auth",
  path: "/auth",
  getParentRoute: () => Route$l
});
const AppRoute = Route$j.update({
  id: "/app",
  path: "/app",
  getParentRoute: () => Route$l
});
const IndexRoute = Route$i.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$l
});
const AppIndexRoute = Route$h.update({
  id: "/",
  path: "/",
  getParentRoute: () => AppRoute
});
const InviteCodeRoute = Route$g.update({
  id: "/invite/$code",
  path: "/invite/$code",
  getParentRoute: () => Route$l
});
const AuthSignupRoute = Route$f.update({
  id: "/signup",
  path: "/signup",
  getParentRoute: () => AuthRoute
});
const AuthLoginRoute = Route$e.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => AuthRoute
});
const AppSettingsRoute = Route$d.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => AppRoute
});
const AppProfileRoute = Route$c.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => AppRoute
});
const AppPlansRoute = Route$b.update({
  id: "/plans",
  path: "/plans",
  getParentRoute: () => AppRoute
});
const AppDmsRoute = Route$a.update({
  id: "/dms",
  path: "/dms",
  getParentRoute: () => AppRoute
});
const AppDiscoverRoute = Route$9.update({
  id: "/discover",
  path: "/discover",
  getParentRoute: () => AppRoute
});
const AppAdminRoute = Route$8.update({
  id: "/admin",
  path: "/admin",
  getParentRoute: () => AppRoute
});
const AppServersIndexRoute = Route$7.update({
  id: "/servers/",
  path: "/servers/",
  getParentRoute: () => AppRoute
});
const AppDmsIndexRoute = Route$6.update({
  id: "/",
  path: "/",
  getParentRoute: () => AppDmsRoute
});
const AppUSlugRoute = Route$5.update({
  id: "/u/$slug",
  path: "/u/$slug",
  getParentRoute: () => AppRoute
});
const AppServersServerIdRoute = Route$4.update({
  id: "/servers/$serverId",
  path: "/servers/$serverId",
  getParentRoute: () => AppRoute
});
const AppSSlugRoute = Route$3.update({
  id: "/s/$slug",
  path: "/s/$slug",
  getParentRoute: () => AppRoute
});
const AppDmsConversationIdRoute = Route$2.update({
  id: "/$conversationId",
  path: "/$conversationId",
  getParentRoute: () => AppDmsRoute
});
const AppServersServerIdChannelIdRoute = Route$1.update({
  id: "/$channelId",
  path: "/$channelId",
  getParentRoute: () => AppServersServerIdRoute
});
const AppServersServerIdThreadsMessageIdRoute = Route.update({
  id: "/threads/$messageId",
  path: "/threads/$messageId",
  getParentRoute: () => AppServersServerIdRoute
});
const AppDmsRouteChildren = {
  AppDmsConversationIdRoute,
  AppDmsIndexRoute
};
const AppDmsRouteWithChildren = AppDmsRoute._addFileChildren(AppDmsRouteChildren);
const AppServersServerIdRouteChildren = {
  AppServersServerIdChannelIdRoute,
  AppServersServerIdThreadsMessageIdRoute
};
const AppServersServerIdRouteWithChildren = AppServersServerIdRoute._addFileChildren(AppServersServerIdRouteChildren);
const AppRouteChildren = {
  AppAdminRoute,
  AppDiscoverRoute,
  AppDmsRoute: AppDmsRouteWithChildren,
  AppPlansRoute,
  AppProfileRoute,
  AppSettingsRoute,
  AppIndexRoute,
  AppSSlugRoute,
  AppServersServerIdRoute: AppServersServerIdRouteWithChildren,
  AppUSlugRoute,
  AppServersIndexRoute
};
const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren);
const AuthRouteChildren = {
  AuthLoginRoute,
  AuthSignupRoute
};
const AuthRouteWithChildren = AuthRoute._addFileChildren(AuthRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AppRoute: AppRouteWithChildren,
  AuthRoute: AuthRouteWithChildren,
  InviteCodeRoute
};
const routeTree = Route$l._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const queryClient = new QueryClient();
  const router2 = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  isCooOrAbove as a,
  isStaff as b,
  useServerContext as c,
  isCeo as i,
  router as r,
  supabase as s,
  useAuth as u
};
