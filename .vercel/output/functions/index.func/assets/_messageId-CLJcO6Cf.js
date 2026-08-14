import { jsx, jsxs } from "react/jsx-runtime";
import { useParams, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { U as UsernameBadge } from "./UsernameBadge-BFbH-T_u.js";
import { I as Input } from "./input-D_U8fI25.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { ArrowLeft, Hash, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "@radix-ui/react-avatar";
import "./badge-YM7oB01y.js";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
function ThreadView() {
  const {
    serverId,
    messageId
  } = useParams({
    from: "/app/servers/$serverId/threads/$messageId"
  });
  const {
    user,
    profile
  } = useAuth();
  const navigate = useNavigate();
  const [root, setRoot] = useState(null);
  const [replies, setReplies] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  async function fetchProfile(uid) {
    const {
      data
    } = await supabase.from("profiles").select("username,display_name,avatar_url,name_color").eq("id", uid).maybeSingle();
    return data;
  }
  useEffect(() => {
    if (!messageId) return;
    supabase.from("messages").select("*").eq("id", messageId).maybeSingle().then(async ({
      data
    }) => {
      if (!data) return;
      const root2 = data;
      root2.author = await fetchProfile(root2.author_id);
      setRoot(root2);
    });
    supabase.from("messages").select("*").eq("thread_root", messageId).order("created_at", {
      ascending: true
    }).then(async ({
      data
    }) => {
      const list = data ?? [];
      for (const m of list) m.author = await fetchProfile(m.author_id);
      setReplies(list);
    });
  }, [messageId]);
  useEffect(() => {
    if (!messageId) return;
    const ch = supabase.channel(`thread-${messageId}`).on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "messages",
      filter: `thread_root=eq.${messageId}`
    }, async (payload) => {
      const m = payload.new;
      m.author = await fetchProfile(m.author_id);
      setReplies((prev) => [...prev, m]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      }));
    }).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [messageId]);
  async function send(e) {
    e.preventDefault();
    if (!user || !text.trim() || sending || !root?.channel_id) return;
    setSending(true);
    const {
      error
    } = await supabase.from("messages").insert({
      channel_id: root.channel_id,
      author_id: user.id,
      content: text.trim(),
      thread_root: messageId
    });
    setText("");
    setSending(false);
    if (error) toast.error(error.message);
  }
  if (!root) return /* @__PURE__ */ jsx("div", { className: "p-8 text-muted-foreground", children: "Carregando thread…" });
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("header", { className: "h-12 border-b border-border px-3 sm:px-4 flex items-center gap-2 bg-card/30 backdrop-blur shrink-0", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8", onClick: () => navigate({
        to: "/app/servers/$serverId/$channelId",
        params: {
          serverId,
          channelId: root.channel_id
        }
      }), children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }) }),
      /* @__PURE__ */ jsx(Hash, { className: "h-5 w-5 text-muted-foreground" }),
      /* @__PURE__ */ jsx("h2", { className: "font-semibold truncate", children: "Thread" }),
      /* @__PURE__ */ jsxs("span", { className: "text-sm text-muted-foreground", children: [
        replies.length,
        " respostas"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { ref: scrollRef, className: "flex-1 overflow-auto px-4 py-3 space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3 pb-3 border-b border-border", children: [
        /* @__PURE__ */ jsxs(Avatar, { className: "h-10 w-10 mt-0.5 shrink-0", children: [
          /* @__PURE__ */ jsx(AvatarImage, { src: root.author?.avatar_url ?? void 0 }),
          /* @__PURE__ */ jsx(AvatarFallback, { children: (root.author?.username ?? "?")[0]?.toUpperCase() })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-2", children: [
            root.author ? /* @__PURE__ */ jsx(UsernameBadge, { profile: root.author }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "…" }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] text-muted-foreground", children: new Date(root.created_at).toLocaleString("pt-BR") })
          ] }),
          root.content && /* @__PURE__ */ jsx("div", { className: "text-sm prose prose-sm prose-invert max-w-none mt-1", children: /* @__PURE__ */ jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: root.content }) })
        ] })
      ] }),
      replies.map((m) => /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsxs(Avatar, { className: "h-8 w-8 mt-0.5 shrink-0", children: [
          /* @__PURE__ */ jsx(AvatarImage, { src: m.author?.avatar_url ?? void 0 }),
          /* @__PURE__ */ jsx(AvatarFallback, { children: (m.author?.username ?? "?")[0]?.toUpperCase() })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-baseline gap-2", children: [
            m.author ? /* @__PURE__ */ jsx(UsernameBadge, { profile: m.author }) : /* @__PURE__ */ jsx("span", { className: "text-muted-foreground", children: "…" }),
            /* @__PURE__ */ jsx("span", { className: "text-[11px] text-muted-foreground", children: new Date(m.created_at).toLocaleString("pt-BR") })
          ] }),
          m.content && /* @__PURE__ */ jsx("div", { className: "text-sm prose prose-sm prose-invert max-w-none mt-0.5", children: /* @__PURE__ */ jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: m.content }) })
        ] })
      ] }, m.id)),
      !replies.length && /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground text-center py-8", children: "Nenhuma resposta ainda. Seja o primeiro!" })
    ] }),
    /* @__PURE__ */ jsx("form", { onSubmit: send, className: "p-3 border-t border-border bg-card/40 shrink-0", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(Input, { value: text, onChange: (e) => setText(e.target.value), placeholder: "Responder na thread…", className: "bg-input border-border h-10" }),
      /* @__PURE__ */ jsx("button", { type: "submit", disabled: !text.trim() || sending, className: "text-muted-foreground hover:text-primary disabled:opacity-40 p-1", children: /* @__PURE__ */ jsx(SendHorizontal, { className: "h-5 w-5" }) })
    ] }) })
  ] });
}
export {
  ThreadView as component
};
