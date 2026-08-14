import { jsxs, jsx } from "react/jsx-runtime";
import { useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { C as Card } from "./card-BtiUI6Md.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { P as PanelaLogo } from "./PanelaLogo-DrUIuaWG.js";
import { s as supabase } from "./router-BokS3urV.js";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import "@radix-ui/react-label";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@tanstack/react-query";
import "@supabase/supabase-js";
function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function onEmail(e) {
    e.preventDefault();
    setLoading(true);
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    router.navigate({
      to: "/app"
    });
  }
  async function onGoogle() {
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/app"
      }
    });
    if (error) toast.error(error.message);
  }
  return /* @__PURE__ */ jsxs(Card, { className: "w-full max-w-sm p-6 space-y-5", children: [
    /* @__PURE__ */ jsx("div", { className: "flex justify-center", children: /* @__PURE__ */ jsx(PanelaLogo, {}) }),
    /* @__PURE__ */ jsx("h1", { className: "text-center text-xl font-semibold", children: "Entrar na panela" }),
    /* @__PURE__ */ jsx(Button, { variant: "outline", className: "w-full", onClick: onGoogle, children: "Continuar com Google" }),
    /* @__PURE__ */ jsxs("div", { className: "relative text-center text-xs text-muted-foreground", children: [
      /* @__PURE__ */ jsx("span", { className: "bg-card px-2 relative z-10", children: "ou com email" }),
      /* @__PURE__ */ jsx("div", { className: "absolute inset-x-0 top-1/2 h-px bg-border" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: onEmail, className: "space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
        /* @__PURE__ */ jsx(Input, { id: "email", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "pw", children: "Senha" }),
        /* @__PURE__ */ jsx(Input, { id: "pw", type: "password", required: true, value: password, onChange: (e) => setPassword(e.target.value) })
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full", disabled: loading, children: [
        loading && /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 mr-2 animate-spin" }),
        "Entrar"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("p", { className: "text-center text-sm text-muted-foreground", children: [
      "Novo por aqui? ",
      /* @__PURE__ */ jsx(Link, { to: "/auth/signup", className: "text-primary hover:underline", children: "Criar conta" })
    ] })
  ] });
}
export {
  Login as component
};
