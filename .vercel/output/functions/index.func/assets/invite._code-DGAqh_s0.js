import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { u as useAuth, s as supabase } from "./router-mRNo7IUv.js";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { B as Button } from "./button-DjOZMqFS.js";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "sonner";
import "@radix-ui/react-slot";
import "class-variance-authority";
import "clsx";
import "tailwind-merge";
function InviteAccept() {
  const {
    code
  } = useParams({
    from: "/invite/$code"
  });
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!user) {
      setStatus("error");
      setMsg("Faça login para aceitar o convite");
      return;
    }
    supabase.rpc("accept_invite", {
      invite_code: code
    }).then(({
      data,
      error
    }) => {
      if (error) {
        setStatus("error");
        setMsg(error.message);
        return;
      }
      setStatus("success");
      setMsg("Você entrou no servidor!");
      setTimeout(() => navigate({
        to: "/app/servers/$serverId",
        params: {
          serverId: String(data)
        }
      }), 1500);
    });
  }, [code, user]);
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background", children: /* @__PURE__ */ jsxs("div", { className: "max-w-sm text-center space-y-4 p-8", children: [
    status === "loading" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Loader2, { className: "h-12 w-12 animate-spin mx-auto text-primary" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground", children: "Entrando…" })
    ] }),
    status === "success" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(CheckCircle2, { className: "h-12 w-12 mx-auto text-emerald-500" }),
      /* @__PURE__ */ jsx("p", { className: "text-emerald-500 font-medium", children: msg })
    ] }),
    status === "error" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(XCircle, { className: "h-12 w-12 mx-auto text-destructive" }),
      /* @__PURE__ */ jsx("p", { className: "text-destructive", children: msg }),
      /* @__PURE__ */ jsx(Button, { onClick: () => navigate({
        to: "/auth/login"
      }), children: "Fazer login" })
    ] })
  ] }) });
}
export {
  InviteAccept as component
};
