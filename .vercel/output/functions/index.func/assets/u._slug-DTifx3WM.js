import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { u as useAuth, s as supabase } from "./router-BokS3urV.js";
import { u as useRealtimeSocket } from "./useRealtime-BsjksZbg.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { B as Badge } from "./badge-YM7oB01y.js";
import { C as Card } from "./card-BtiUI6Md.js";
import { B as Button } from "./button-DjOZMqFS.js";
import { T as Tabs, b as TabsList, c as TabsTrigger, a as TabsContent } from "./tabs-QL-0JTj_.js";
import { U as UsernameBadge } from "./UsernameBadge-BFbH-T_u.js";
import { MessageSquare, Loader2, UserPlus, UserX, UserCheck, Users, ArrowLeft, Sparkles, Medal, Shield, Hash, Music, Disc, Camera, Share2, Share, Code, Globe, Calendar, Star, Server, Zap, Activity, Clock } from "lucide-react";
import { toast } from "sonner";
import "@tanstack/react-query";
import "@supabase/supabase-js";
import "socket.io-client";
import "@radix-ui/react-avatar";
import "class-variance-authority";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-tabs";
function FriendButton({ targetUserId }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [actionLoading, setActionLoading] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.from("friends").select("status, user_id, friend_id").or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`).then(({ data }) => {
      if (!data?.length) return setStatus("none");
      const rel = data[0];
      if (rel.status === "accepted") setStatus("accepted");
      else if (rel.user_id === user.id) setStatus("pending");
      else setStatus("requested");
    });
  }, [user?.id, targetUserId]);
  async function startDM() {
    if (!user) return;
    const { data: shared } = await supabase.rpc("get_shared_dm_conversation", { other_user_id: targetUserId });
    const sharedArr = shared ?? [];
    if (sharedArr.length) {
      navigate({ to: "/app/dms/$conversationId", params: { conversationId: sharedArr[0].conversation_id } });
      return;
    }
    const convId = crypto.randomUUID();
    const { error } = await supabase.from("dm_conversations").insert({ id: convId });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("dm_participants").insert([
      { conversation_id: convId, user_id: user.id },
      { conversation_id: convId, user_id: targetUserId }
    ]);
    navigate({ to: "/app/dms/$conversationId", params: { conversationId: convId } });
  }
  async function addFriend() {
    if (!user) return;
    setActionLoading(true);
    const { error } = await supabase.from("friends").insert({
      user_id: user.id,
      friend_id: targetUserId
    });
    setActionLoading(false);
    if (error) return toast.error(error.message);
    setStatus("pending");
    toast.success("Solicitação enviada!");
  }
  async function acceptFriend() {
    if (!user) return;
    setActionLoading(true);
    const { error } = await supabase.from("friends").update({ status: "accepted" }).eq("user_id", targetUserId).eq("friend_id", user.id);
    setActionLoading(false);
    if (error) return toast.error(error.message);
    setStatus("accepted");
    toast.success("Amizade aceita!");
  }
  if (!user || targetUserId === user.id) return null;
  return /* @__PURE__ */ jsxs("div", { className: "flex gap-1.5", children: [
    /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: startDM, className: "gap-1.5", children: [
      /* @__PURE__ */ jsx(MessageSquare, { className: "h-4 w-4" }),
      " Mensagem"
    ] }),
    status === "none" && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", onClick: addFriend, disabled: actionLoading, className: "gap-1.5", children: [
      actionLoading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(UserPlus, { className: "h-4 w-4" }),
      "Adicionar"
    ] }),
    status === "pending" && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5 text-muted-foreground", disabled: true, children: [
      /* @__PURE__ */ jsx(UserX, { className: "h-4 w-4" }),
      " Solicitado"
    ] }),
    status === "requested" && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "default", onClick: acceptFriend, disabled: actionLoading, className: "gap-1.5", children: [
      actionLoading ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(UserCheck, { className: "h-4 w-4" }),
      "Aceitar"
    ] }),
    status === "accepted" && /* @__PURE__ */ jsxs(Button, { size: "sm", variant: "outline", className: "gap-1.5 text-emerald-500", disabled: true, children: [
      /* @__PURE__ */ jsx(UserCheck, { className: "h-4 w-4" }),
      " Amigos"
    ] })
  ] });
}
const STATUS_MAP = {
  online: {
    label: "Online",
    dot: "bg-emerald-500"
  },
  idle: {
    label: "Ausente",
    dot: "bg-yellow-500"
  },
  dnd: {
    label: "Ocupado",
    dot: "bg-red-500"
  },
  offline: {
    label: "Offline",
    dot: "bg-muted-foreground/30"
  }
};
const SOCIAL_ICONS = {
  github: Code,
  twitter: Share,
  linkedin: Share2,
  instagram: Camera,
  youtube: Disc,
  tiktok: Music
};
const PLATFORM_COLORS = {
  github: "hover:text-[#888]",
  twitter: "hover:text-[#1DA1F2]",
  linkedin: "hover:text-[#0A66C2]",
  instagram: "hover:text-[#E4405F]",
  youtube: "hover:text-[#FF0000]",
  tiktok: "hover:text-[#00F2EA]"
};
function PublicProfile() {
  const {
    slug
  } = useParams({
    from: "/app/u/$slug"
  });
  const {
    user,
    session
  } = useAuth();
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [servers, setServers] = useState([]);
  const [serverXp, setServerXp] = useState([]);
  const [stats, setStats] = useState(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("about");
  const [targetId, setTargetId] = useState(null);
  const [status, setStatus] = useState("offline");
  const [statusText, setStatusText] = useState("");
  const [notFound, setNotFound] = useState(false);
  const {
    socket
  } = useRealtimeSocket();
  const isOwn = user?.id != null && (user.id === slug || user.id === targetId);
  useEffect(() => {
    if (!slug) return;
    setTargetId(null);
    setNotFound(false);
    let cancelled = false;
    let cleanupSocket = () => {
    };
    async function load() {
      let profile2;
      const {
        data: byName
      } = await supabase.from("profiles").select("*").eq("username", slug).maybeSingle();
      if (byName) profile2 = byName;
      else {
        const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPat.test(slug)) {
          const {
            data: byId
          } = await supabase.from("profiles").select("*").eq("id", slug).maybeSingle();
          if (byId) profile2 = byId;
        }
      }
      if (cancelled) return;
      if (!profile2) {
        setNotFound(true);
        return;
      }
      const uid = profile2.id;
      setProfile(profile2);
      setTargetId(uid);
      const [rolesRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid)
        // statsRes - profile_stats table doesn't exist yet
        // friendsRes - friends table doesn't exist yet
        // xpRes - server_xp table doesn't exist yet
      ]);
      if (cancelled) return;
      setRoles((rolesRes.data ?? []).map((r) => r.role));
      setStats(null);
      setFriendsCount(0);
      setServerXp([]);
      if (user) {
        const {
          data: mems
        } = await supabase.from("server_members").select("server_id").eq("user_id", uid);
        if (mems?.length && !cancelled) {
          const ids = mems.map((m) => m.server_id);
          const {
            data: sv
          } = await supabase.from("servers").select("id, name, icon_url, privacy").in("id", ids);
          if (!cancelled) setServers(sv ?? []);
        }
      }
      setStatusText(profile2.status_text || "");
      if (user && socket) {
        const onUsers = (users) => {
          const found = users.find((u) => u.userId === uid);
          if (found) setStatus(found.status || "online");
        };
        const joinProfileRoom = () => {
          socket.emit("presence:join", {
            serverId: "__profile__",
            status: "online"
          });
          socket.emit("presence:subscribe", [uid]);
        };
        socket.on("presence:users", onUsers);
        socket.on("connect", joinProfileRoom);
        if (socket.connected) joinProfileRoom();
        cleanupSocket = () => {
          socket.off("presence:users", onUsers);
          socket.off("connect", joinProfileRoom);
        };
      }
    }
    load();
    return () => {
      cancelled = true;
      cleanupSocket();
    };
  }, [slug, user?.id, socket]);
  if (notFound) {
    return /* @__PURE__ */ jsxs("div", { className: "max-w-lg mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "h-20 w-20 rounded-full bg-muted grid place-items-center mb-4", children: /* @__PURE__ */ jsx(Users, { className: "h-10 w-10 text-muted-foreground/40" }) }),
      /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold mb-1", children: "Usuário não encontrado" }),
      /* @__PURE__ */ jsxs("p", { className: "text-sm text-muted-foreground mb-6", children: [
        "Ninguém com “",
        slug,
        "” foi encontrado."
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "..", children: /* @__PURE__ */ jsxs(Button, { variant: "outline", className: "gap-1.5", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
        " Voltar"
      ] }) })
    ] });
  }
  if (!profile) {
    return /* @__PURE__ */ jsx("div", { className: "max-w-lg mx-auto p-4 animate-pulse", children: /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden rounded-2xl border-0 bg-card/60", children: [
      /* @__PURE__ */ jsx("div", { className: "h-28 bg-muted" }),
      /* @__PURE__ */ jsxs("div", { className: "px-5 pb-5 -mt-14", children: [
        /* @__PURE__ */ jsx("div", { className: "h-20 w-20 rounded-full bg-muted ring-4 ring-card" }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-2", children: [
          /* @__PURE__ */ jsx("div", { className: "h-5 w-36 bg-muted rounded" }),
          /* @__PURE__ */ jsx("div", { className: "h-3 w-24 bg-muted rounded" })
        ] })
      ] })
    ] }) });
  }
  const st = STATUS_MAP[status] || STATUS_MAP.offline;
  const totalXp = serverXp.reduce((s, x) => s + x.xp, 0);
  const socialLinks = profile.social_links;
  return /* @__PURE__ */ jsxs("div", { className: "max-w-lg mx-auto p-3 md:p-6 space-y-3", children: [
    /* @__PURE__ */ jsxs(Link, { to: "..", className: "inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground w-fit transition-colors mb-1", children: [
      /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" }),
      " Voltar"
    ] }),
    /* @__PURE__ */ jsxs(Card, { className: "overflow-hidden rounded-2xl border-0 bg-card/50 backdrop-blur shadow-2xl", children: [
      /* @__PURE__ */ jsx("div", { className: "h-24 md:h-28 relative overflow-hidden bg-gradient-to-r from-indigo-600/70 via-violet-600/40 to-purple-800/50", style: profile.banner_url ? {
        backgroundImage: `url(${profile.banner_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      } : void 0, children: !profile.banner_url && /* @__PURE__ */ jsxs("div", { className: "absolute inset-0", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" }),
        /* @__PURE__ */ jsx("div", { className: "absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/5 blur-2xl" })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "px-4 pb-4 -mt-12 relative z-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-fit", children: [
          /* @__PURE__ */ jsxs(Avatar, { className: "h-20 w-20 ring-[4px] ring-card shadow-xl rounded-full", children: [
            /* @__PURE__ */ jsx(AvatarImage, { src: profile.avatar_url ?? void 0, className: "object-cover" }),
            /* @__PURE__ */ jsx(AvatarFallback, { className: "text-xl font-bold bg-gradient-to-br from-indigo-500 to-violet-600 text-white", children: profile.username?.[0]?.toUpperCase() })
          ] }),
          /* @__PURE__ */ jsx("span", { className: `absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full border-[3px] border-card ${st.dot}` })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-2.5", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 flex-wrap", children: [
            /* @__PURE__ */ jsxs("div", { className: "text-lg font-bold flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx(UsernameBadge, { profile, roles }),
              profile.current_plan === "pro" && /* @__PURE__ */ jsx(Sparkles, { className: "h-4 w-4 text-amber-400 fill-amber-400/30" })
            ] }),
            targetId && !isOwn && /* @__PURE__ */ jsx(FriendButton, { targetUserId: targetId })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/60", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "@",
              profile.username
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/20", children: "·" }),
            /* @__PURE__ */ jsxs("span", { className: `flex items-center gap-1 ${status === "online" ? "text-emerald-400" : status === "idle" ? "text-yellow-400" : status === "dnd" ? "text-red-400" : "text-muted-foreground/40"}`, children: [
              /* @__PURE__ */ jsx("span", { className: `h-2 w-2 rounded-full ${st.dot}` }),
              st.label
            ] })
          ] })
        ] }),
        statusText && /* @__PURE__ */ jsxs("div", { className: "mt-2 text-sm text-muted-foreground/70 italic flex items-start gap-1.5 bg-accent/20 rounded-lg px-3 py-1.5 border border-border/30", children: [
          /* @__PURE__ */ jsx(MessageSquare, { className: "h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" }),
          /* @__PURE__ */ jsxs("span", { children: [
            "“",
            statusText,
            "”"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "my-3 border-t border-border/40" }),
        roles.length > 0 && /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5 mb-3", children: roles.map((r) => /* @__PURE__ */ jsxs(Badge, { className: `text-[10px] font-semibold uppercase tracking-wider gap-1 px-2 py-0.5 border-0 rounded-md ${r === "ceo" ? "bg-gradient-to-r from-red-600/90 to-orange-500/90 text-white" : r === "admin" ? "bg-gradient-to-r from-blue-600/90 to-cyan-500/90 text-white" : "bg-accent/60 text-muted-foreground/80"}`, children: [
          r === "ceo" ? /* @__PURE__ */ jsx(Medal, { className: "h-3 w-3" }) : r === "admin" ? /* @__PURE__ */ jsx(Shield, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(Hash, { className: "h-3 w-3 opacity-50" }),
          r
        ] }, r)) }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50", children: "Sobre mim" }),
          profile.bio ? /* @__PURE__ */ jsx("div", { className: "text-sm prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-a:text-primary prose-img:rounded-md bg-accent/10 rounded-xl p-3 border border-border/30", children: /* @__PURE__ */ jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: profile.bio }) }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground/40 italic", children: "Nada informado." })
        ] }),
        socialLinks && Object.keys(socialLinks).length > 0 && /* @__PURE__ */ jsxs("div", { className: "mt-3 space-y-1", children: [
          /* @__PURE__ */ jsx("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50", children: "Links" }),
          /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1.5", children: Object.entries(socialLinks).map(([platform, url]) => {
            const Icon = SOCIAL_ICONS[platform] || Globe;
            const hoverColor = PLATFORM_COLORS[platform] || "hover:text-foreground";
            const href = typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://")) ? url : `https://${platform}.com/${url}`;
            return /* @__PURE__ */ jsxs("a", { href, target: "_blank", rel: "noopener noreferrer", className: `inline-flex items-center gap-1.5 text-xs bg-accent/30 hover:bg-accent/60 text-muted-foreground/70 ${hoverColor} rounded-lg px-2.5 py-1.5 border border-border/40 transition-all`, children: [
              /* @__PURE__ */ jsx(Icon, { className: "h-3.5 w-3.5" }),
              url
            ] }, platform);
          }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/50", children: [
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Calendar, { className: "h-3 w-3" }),
            "Entrou em ",
            new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR", {
              month: "short",
              year: "numeric"
            })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/20", children: "·" }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Star, { className: "h-3 w-3" }),
            totalXp,
            " XP"
          ] }),
          /* @__PURE__ */ jsx("span", { className: "text-muted-foreground/20", children: "·" }),
          /* @__PURE__ */ jsxs("span", { className: "flex items-center gap-1", children: [
            /* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }),
            friendsCount,
            " amigos"
          ] })
        ] })
      ] })
    ] }),
    servers.length > 0 && /* @__PURE__ */ jsxs(Card, { className: "rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5", children: [
      /* @__PURE__ */ jsxs("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Server, { className: "h-3 w-3" }),
        "Servidores em comum (",
        servers.length,
        ")"
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2", children: [
        servers.slice(0, 12).map((s) => /* @__PURE__ */ jsx(Link, { to: "/app/servers/$serverId", params: {
          serverId: s.id
        }, className: "group relative", title: s.name, children: s.icon_url ? /* @__PURE__ */ jsx("img", { src: s.icon_url, alt: s.name, className: "h-10 w-10 rounded-xl object-cover ring-1 ring-border/20 group-hover:ring-primary/40 transition-all" }) : /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-border/20 group-hover:ring-primary/40 grid place-items-center font-bold text-primary text-xs transition-all", children: s.name[0]?.toUpperCase() }) }, s.id)),
        servers.length > 12 && /* @__PURE__ */ jsxs("div", { className: "h-10 w-10 rounded-xl bg-accent/40 grid place-items-center text-xs font-bold text-muted-foreground/60", children: [
          "+",
          servers.length - 12
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-4 gap-2", children: [{
      label: "Mensagens",
      value: stats?.messages_total ?? 0,
      icon: MessageSquare,
      color: "text-primary"
    }, {
      label: "Servidores",
      value: stats?.servers_total ?? 0,
      icon: Server,
      color: "text-emerald-400"
    }, {
      label: "Amigos",
      value: friendsCount,
      icon: Users,
      color: "text-amber-400"
    }, {
      label: "XP",
      value: totalXp,
      icon: Zap,
      color: "text-violet-400"
    }].map((item, i) => /* @__PURE__ */ jsxs(Card, { className: "rounded-xl border-0 bg-card/30 backdrop-blur p-2.5 text-center hover:bg-card/50 transition-colors", children: [
      /* @__PURE__ */ jsx(item.icon, { className: `h-4 w-4 mx-auto mb-1 ${item.color}` }),
      /* @__PURE__ */ jsx("p", { className: "text-sm font-bold tabular-nums leading-tight", children: item.value.toLocaleString("pt-BR") }),
      /* @__PURE__ */ jsx("p", { className: "text-[9px] text-muted-foreground/50 leading-tight truncate", children: item.label })
    ] }, i)) }),
    serverXp.length > 0 && /* @__PURE__ */ jsxs(Card, { className: "rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "p-3.5", children: /* @__PURE__ */ jsxs("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx(Zap, { className: "h-3 w-3 text-amber-400" }),
        "XP por Servidor"
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "divide-y divide-border/20", children: serverXp.slice(0, 5).map((entry) => {
        const sv = entry.servers;
        const level = Math.floor(Math.sqrt(entry.xp / 10));
        const nextXp = (level + 1) ** 2 * 10;
        const progress = Math.min(entry.xp / nextXp, 1);
        return /* @__PURE__ */ jsxs(Link, { to: sv ? "/app/servers/$serverId" : "/app/servers", params: sv ? {
          serverId: sv.id
        } : void 0, className: `flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-accent/20 transition-colors ${!sv ? "pointer-events-none" : ""}`, children: [
          sv?.icon_url ? /* @__PURE__ */ jsx("img", { src: sv.icon_url, alt: "", className: "h-8 w-8 rounded-lg object-cover shrink-0 ring-1 ring-border/10" }) : /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-border/10 grid place-items-center font-bold text-primary text-[10px] shrink-0", children: sv?.name?.[0]?.toUpperCase() || "?" }),
          /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
              /* @__PURE__ */ jsx("p", { className: "text-xs font-medium truncate", children: sv?.name || "—" }),
              /* @__PURE__ */ jsxs("span", { className: "text-[11px] font-mono text-muted-foreground/60 shrink-0", children: [
                entry.xp,
                " XP"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
              /* @__PURE__ */ jsx("div", { className: "flex-1 h-1 bg-accent/40 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all", style: {
                width: `${progress * 100}%`
              } }) }),
              /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-muted-foreground/50 shrink-0", children: [
                "Nv.",
                level
              ] })
            ] })
          ] })
        ] }, sv?.id || Math.random());
      }) }),
      serverXp.length > 5 && /* @__PURE__ */ jsxs("button", { onClick: () => setActiveTab("xp"), className: "w-full text-center text-[11px] text-muted-foreground/50 hover:text-foreground py-2.5 bg-accent/10 hover:bg-accent/20 transition-colors font-medium", children: [
        "Ver todos os ",
        serverXp.length,
        " servidores"
      ] })
    ] }),
    serverXp.length === 0 && /* @__PURE__ */ jsx("button", { onClick: () => {
    }, className: "w-full text-center text-xs text-muted-foreground/50 py-4 italic", children: "Nenhum XP acumulado ainda" }),
    /* @__PURE__ */ jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, children: [
      /* @__PURE__ */ jsxs(TabsList, { className: "w-full grid grid-cols-3 h-9 bg-accent/50 p-0.5 rounded-xl md:hidden", children: [
        /* @__PURE__ */ jsx(TabsTrigger, { value: "about", className: "text-xs data-[state=active]:bg-background rounded-lg", children: "Sobre" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "servers", className: "text-xs data-[state=active]:bg-background rounded-lg", children: "Servidores" }),
        /* @__PURE__ */ jsx(TabsTrigger, { value: "xp", className: "text-xs data-[state=active]:bg-background rounded-lg", children: "XP" })
      ] }),
      /* @__PURE__ */ jsx(TabsContent, { value: "about", className: "mt-3 md:hidden", children: /* @__PURE__ */ jsxs(Card, { className: "rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5", children: [
        /* @__PURE__ */ jsxs("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Activity, { className: "h-3 w-3" }),
          " Atividade"
        ] }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-2", children: [{
          icon: MessageSquare,
          c: "bg-primary/10",
          label: "Mensagens",
          value: stats?.messages_total ?? 0
        }, {
          icon: Server,
          c: "bg-emerald-500/10",
          label: "Servidores",
          value: stats?.servers_total ?? 0
        }, {
          icon: Star,
          c: "bg-amber-500/10",
          label: "XP",
          value: totalXp,
          suffix: " XP"
        }, {
          icon: Clock,
          c: "bg-blue-500/10",
          label: "Membro há",
          value: profile.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1e3 * 60 * 60 * 24)) : 0,
          suffix: "d"
        }].map((item, i) => /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 rounded-xl bg-accent/20 p-2.5 border border-border/20", children: [
          /* @__PURE__ */ jsx("div", { className: `h-8 w-8 rounded-lg ${item.c} grid place-items-center shrink-0`, children: /* @__PURE__ */ jsx(item.icon, { className: "h-4 w-4 text-inherit" }) }),
          /* @__PURE__ */ jsxs("div", { className: "min-w-0", children: [
            /* @__PURE__ */ jsx("p", { className: "text-[10px] text-muted-foreground/60", children: item.label }),
            /* @__PURE__ */ jsxs("p", { className: "text-sm font-bold tabular-nums", children: [
              item.value,
              item.suffix || ""
            ] })
          ] })
        ] }, i)) })
      ] }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "servers", className: "mt-3 md:hidden", children: /* @__PURE__ */ jsxs(Card, { className: "rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5", children: [
        /* @__PURE__ */ jsxs("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Server, { className: "h-3 w-3" }),
          " Servidores"
        ] }),
        servers.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/50 italic py-4 text-center", children: "Nenhum servidor em comum." }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-2 gap-1.5", children: servers.map((s) => /* @__PURE__ */ jsxs(Link, { to: "/app/servers/$serverId", params: {
          serverId: s.id
        }, className: "flex items-center gap-2.5 rounded-lg bg-accent/20 hover:bg-accent/40 p-2 transition-colors group", children: [
          s.icon_url ? /* @__PURE__ */ jsx("img", { src: s.icon_url, alt: "", className: "h-8 w-8 rounded-lg object-cover shrink-0" }) : /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center font-bold text-primary text-xs shrink-0", children: s.name[0]?.toUpperCase() }),
          /* @__PURE__ */ jsx("p", { className: "text-xs font-medium truncate group-hover:text-foreground transition-colors", children: s.name })
        ] }, s.id)) })
      ] }) }),
      /* @__PURE__ */ jsx(TabsContent, { value: "xp", className: "mt-3 md:hidden", children: /* @__PURE__ */ jsxs(Card, { className: "rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5", children: [
        /* @__PURE__ */ jsxs("h4", { className: "text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Zap, { className: "h-3 w-3 text-amber-400" }),
          " XP por Servidor"
        ] }),
        serverXp.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/50 italic py-4 text-center", children: "Nenhum XP acumulado ainda." }) : /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: serverXp.map((entry) => {
          const sv = entry.servers;
          const level = Math.floor(Math.sqrt(entry.xp / 10));
          const nextXp = (level + 1) ** 2 * 10;
          const progress = Math.min(entry.xp / nextXp, 1);
          return /* @__PURE__ */ jsxs(Link, { to: sv ? "/app/servers/$serverId" : "/app/servers", params: sv ? {
            serverId: sv.id
          } : void 0, className: `flex items-center gap-2.5 rounded-lg hover:bg-accent/20 p-2 transition-colors ${!sv ? "pointer-events-none" : ""}`, children: [
            sv?.icon_url ? /* @__PURE__ */ jsx("img", { src: sv.icon_url, alt: "", className: "h-8 w-8 rounded-lg object-cover shrink-0" }) : /* @__PURE__ */ jsx("div", { className: "h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center font-bold text-primary text-xs shrink-0", children: sv?.name?.[0]?.toUpperCase() || "?" }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between gap-2", children: [
                /* @__PURE__ */ jsx("p", { className: "text-xs font-medium truncate", children: sv?.name || "—" }),
                /* @__PURE__ */ jsxs("span", { className: "text-[10px] font-mono text-muted-foreground/50", children: [
                  entry.xp,
                  " XP"
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 mt-0.5", children: [
                /* @__PURE__ */ jsx("div", { className: "flex-1 h-1 bg-accent/40 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx("div", { className: "h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full", style: {
                  width: `${progress * 100}%`
                } }) }),
                /* @__PURE__ */ jsxs("span", { className: "text-[10px] text-muted-foreground/50", children: [
                  "Lv.",
                  level
                ] })
              ] })
            ] })
          ] }, sv?.id || Math.random());
        }) })
      ] }) })
    ] })
  ] });
}
export {
  PublicProfile as component
};
