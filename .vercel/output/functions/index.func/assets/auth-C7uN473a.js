import { jsx } from "react/jsx-runtime";
import { Outlet } from "@tanstack/react-router";
import { a as RequireGuest } from "./AuthGate-C8DikIZp.js";
import "react";
import "./router-BokS3urV.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "lucide-react";
import "./PanelaLogo-DrUIuaWG.js";
const SplitComponent = () => /* @__PURE__ */ jsx(RequireGuest, { children: /* @__PURE__ */ jsx("div", { className: "min-h-screen grid place-items-center px-4 py-10 bg-background", children: /* @__PURE__ */ jsx(Outlet, {}) }) });
export {
  SplitComponent as component
};
