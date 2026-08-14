import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { useRouter, useLocation } from "@tanstack/react-router";
import { u as useAuth } from "./router-mRNo7IUv.js";
import { P as PanelaLogo } from "./PanelaLogo-DrUIuaWG.js";
function RequireAuth({ children }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  const loc = useLocation();
  useEffect(() => {
    if (ready && !user) {
      const back = encodeURIComponent(loc.pathname + loc.search);
      router.navigate({ to: "/auth/login", search: { redirect: back }, replace: true });
    }
  }, [ready, user]);
  if (!ready || !user) return /* @__PURE__ */ jsx(FullScreenLoader, { label: "Esquentando a panela…" });
  return /* @__PURE__ */ jsx(Fragment, { children });
}
function RequireGuest({ children }) {
  const { ready, user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready && user) router.navigate({ to: "/app", replace: true });
  }, [ready, user]);
  if (!ready) return /* @__PURE__ */ jsx(FullScreenLoader, { label: "Carregando…" });
  if (user) return /* @__PURE__ */ jsx(FullScreenLoader, { label: "Entrando…" });
  return /* @__PURE__ */ jsx(Fragment, { children });
}
function FullScreenLoader({ label }) {
  return /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center px-4 bg-background", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-3 text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "animate-pulse", children: /* @__PURE__ */ jsx(PanelaLogo, { size: 40 }) }),
    /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: label ?? "Carregando…" })
  ] }) });
}
export {
  FullScreenLoader as F,
  RequireAuth as R,
  RequireGuest as a
};
