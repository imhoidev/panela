import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getSocket } from "@/lib/socket";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsernameBadge } from "@/components/UsernameBadge";
import { FriendButton } from "@/components/FriendButton";
import {
  ArrowLeft, AtSign, MessageSquare, Activity,
  Server, Medal, Star, Users, MapPin,
  Globe, Github, Shield, Sparkles, Clock, Zap,
  Linkedin, ExternalLink, Trophy, Twitter, Hash,
  Camera, Music, Gamepad2, Youtube,
} from "lucide-react";

export const Route = createFileRoute("/app/u/$slug")({
  component: PublicProfile,
});

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  online:  { label: "Online",  dot: "bg-emerald-500" },
  idle:    { label: "Ausente", dot: "bg-yellow-500"  },
  dnd:     { label: "Ocupado", dot: "bg-red-500"     },
  offline: { label: "Offline", dot: "bg-muted-foreground/30" },
};

const SOCIAL_ICONS: Record<string, typeof Globe> = {
  github: Github, twitter: Twitter, linkedin: Linkedin,
  instagram: Globe, youtube: Youtube, tiktok: Globe,
};

const PLATFORM_COLORS: Record<string, string> = {
  github: "hover:text-[#888]",
  twitter: "hover:text-[#1DA1F2]",
  linkedin: "hover:text-[#0A66C2]",
  instagram: "hover:text-[#E4405F]",
  youtube: "hover:text-[#FF0000]",
  tiktok: "hover:text-[#00F2EA]",
};

function PublicProfile() {
  const { slug } = useParams({ from: "/app/u/$slug" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [serverXp, setServerXp] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("about");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("offline");
  const [statusText, setStatusText] = useState<string>("");
  const [notFound, setNotFound] = useState(false);

  const isOwn = user?.id != null && (user.id === slug || user.id === targetId);

  useEffect(() => {
    if (!slug) return;
    setTargetId(null); setNotFound(false);
    let cancelled = false;

    async function load() {
      let profile: any;
      const { data: byName } = await supabase.from("profiles").select("*").eq("username", slug).maybeSingle();
      if (byName) profile = byName;
      else {
        const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPat.test(slug)) {
          const { data: byId } = await supabase.from("profiles").select("*").eq("id", slug).maybeSingle();
          if (byId) profile = byId;
        }
      }
      if (cancelled) return;
      if (!profile) { setNotFound(true); return; }

      const uid = profile.id;
      setProfile(profile);
      setTargetId(uid);

      const [rolesRes, statsRes, friendsRes, xpRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("profile_stats").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("friends").select("id", { count: "exact", head: true })
          .or(`user_id.eq.${uid},friend_id.eq.${uid}`).eq("status", "accepted"),
        supabase.from("server_xp").select("xp, servers(name, icon_url, id)")
          .eq("user_id", uid).order("xp", { ascending: false }).limit(10),
      ]);

      if (cancelled) return;
      setRoles((rolesRes.data ?? []).map((r: any) => r.role));
      setStats(statsRes.data);
      setFriendsCount(friendsRes.count ?? 0);
      setServerXp(xpRes.data ?? []);

      if (user) {
        const { data: mems } = await supabase.from("server_members").select("server_id").eq("user_id", uid);
        if (mems?.length && !cancelled) {
          const ids = mems.map((m) => m.server_id);
          const { data: sv } = await supabase.from("servers").select("id, name, icon_url, privacy").in("id", ids);
          if (!cancelled) setServers(sv ?? []);
        }
      }

      setStatusText(profile.status_text || "");
      const s = getSocket(uid);
      const onUsers = (users: { userId: string; status: string }[]) => {
        const found = users.find((u) => u.userId === uid);
        if (found) setStatus(found.status || "online");
      };
      s.on("presence:users", onUsers);
      if (s.connected) s.emit("presence:join", { userId: uid, serverId: "__profile__" });
      else s.on("connect", () => s.emit("presence:join", { userId: uid, serverId: "__profile__" }));
    }

    load();
    return () => { cancelled = true; };
  }, [slug, user?.id]);

  // ── 404 ──
  if (notFound) {
    return (
      <div className="max-w-lg mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-20 w-20 rounded-full bg-muted grid place-items-center mb-4">
          <Users className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold mb-1">Usuário não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-6">Ninguém com &ldquo;{slug}&rdquo; foi encontrado.</p>
        <Link to=".."><Button variant="outline" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Voltar</Button></Link>
      </div>
    );
  }

  // ── Skeleton ──
  if (!profile) {
    return (
      <div className="max-w-lg mx-auto p-4 animate-pulse">
        <Card className="overflow-hidden rounded-2xl border-0 bg-card/60">
          <div className="h-28 bg-muted" />
          <div className="px-5 pb-5 -mt-14">
            <div className="h-20 w-20 rounded-full bg-muted ring-4 ring-card" />
            <div className="mt-3 space-y-2">
              <div className="h-5 w-36 bg-muted rounded" />
              <div className="h-3 w-24 bg-muted rounded" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const st = STATUS_MAP[status] || STATUS_MAP.offline;
  const totalXp = serverXp.reduce((s, x) => s + x.xp, 0);
  const socialLinks = profile.social_links as Record<string, string> | null;

  return (
    <div className="max-w-lg mx-auto p-3 md:p-6 space-y-3">
      <Link to=".." className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-foreground w-fit transition-colors mb-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      {/* ─── Discord Profile Card ─── */}
      <Card className="overflow-hidden rounded-2xl border-0 bg-card/50 backdrop-blur shadow-2xl">
        {/* Banner */}
        <div className="h-24 md:h-28 relative overflow-hidden bg-gradient-to-r from-indigo-600/70 via-violet-600/40 to-purple-800/50"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {!profile.banner_url && (
            <div className="absolute inset-0">
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/5 blur-2xl" />
            </div>
          )}
        </div>

        <div className="px-4 pb-4 -mt-12 relative z-10">
          {/* Avatar (floating, left-aligned like Discord) */}
          <div className="relative w-fit">
            <Avatar className="h-20 w-20 ring-[4px] ring-card shadow-xl rounded-full">
              <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
              <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                {profile.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full border-[3px] border-card ${st.dot}`} />
          </div>

          {/* Name + @ */}
          <div className="mt-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-lg font-bold flex items-center gap-1.5">
                <UsernameBadge profile={profile} roles={roles} />
                {profile.current_plan === "pro" && (
                  <Sparkles className="h-4 w-4 text-amber-400 fill-amber-400/30" />
                )}
              </div>
              {targetId && !isOwn && <FriendButton targetUserId={targetId} />}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground/60">
              <span>@{profile.username}</span>
              <span className="text-muted-foreground/20">·</span>
              <span className={`flex items-center gap-1 ${
                status === "online" ? "text-emerald-400" :
                status === "idle" ? "text-yellow-400" :
                status === "dnd" ? "text-red-400" : "text-muted-foreground/40"
              }`}>
                <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            </div>
          </div>

          {/* Custom status */}
          {statusText && (
            <div className="mt-2 text-sm text-muted-foreground/70 italic flex items-start gap-1.5 bg-accent/20 rounded-lg px-3 py-1.5 border border-border/30">
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/40" />
              <span>&ldquo;{statusText}&rdquo;</span>
            </div>
          )}

          {/* Separator */}
          <div className="my-3 border-t border-border/40" />

          {/* Roles */}
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {roles.map((r) => (
                <Badge key={r}
                  className={`text-[10px] font-semibold uppercase tracking-wider gap-1 px-2 py-0.5 border-0 rounded-md ${
                    r === "ceo" ? "bg-gradient-to-r from-red-600/90 to-orange-500/90 text-white" :
                    r === "admin" ? "bg-gradient-to-r from-blue-600/90 to-cyan-500/90 text-white" :
                    "bg-accent/60 text-muted-foreground/80"
                  }`}>
                  {r === "ceo" ? <Medal className="h-3 w-3" /> : r === "admin" ? <Shield className="h-3 w-3" /> : <Hash className="h-3 w-3 opacity-50" />}
                  {r}
                </Badge>
              ))}
            </div>
          )}

          {/* About Me */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">Sobre mim</h4>
            {profile.bio ? (
              <div className="text-sm prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-a:text-primary prose-img:rounded-md bg-accent/10 rounded-xl p-3 border border-border/30">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{profile.bio}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/40 italic">Nada informado.</p>
            )}
          </div>

          {/* Social links */}
          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="mt-3 space-y-1">
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">Links</h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(socialLinks).map(([platform, url]) => {
                  const Icon = SOCIAL_ICONS[platform] || Globe;
                  const hoverColor = PLATFORM_COLORS[platform] || "hover:text-foreground";
                  const href = typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://")) ? url : `https://${platform}.com/${url}`;
                  return (
                    <a key={platform} href={href} target="_blank" rel="noopener noreferrer"
                      className={`inline-flex items-center gap-1.5 text-xs bg-accent/30 hover:bg-accent/60 text-muted-foreground/70 ${hoverColor} rounded-lg px-2.5 py-1.5 border border-border/40 transition-all`}>
                      <Icon className="h-3.5 w-3.5" />
                      {url}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/50">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Entrou em {new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
            <span className="text-muted-foreground/20">·</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3" />{totalXp} XP</span>
            <span className="text-muted-foreground/20">·</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{friendsCount} amigos</span>
          </div>
        </div>
      </Card>

      {/* ─── Mutual Servers (Discord-style icons) ─── */}
      {servers.length > 0 && (
        <Card className="rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5">
            <Server className="h-3 w-3" />
            Servidores em comum ({servers.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {servers.slice(0, 12).map((s) => (
              <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }}
                className="group relative" title={s.name}>
                {s.icon_url ? (
                  <img src={s.icon_url} alt={s.name}
                    className="h-10 w-10 rounded-xl object-cover ring-1 ring-border/20 group-hover:ring-primary/40 transition-all" />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-border/20 group-hover:ring-primary/40 grid place-items-center font-bold text-primary text-xs transition-all">
                    {s.name[0]?.toUpperCase()}
                  </div>
                )}
              </Link>
            ))}
            {servers.length > 12 && (
              <div className="h-10 w-10 rounded-xl bg-accent/40 grid place-items-center text-xs font-bold text-muted-foreground/60">
                +{servers.length - 12}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ─── Stats Grid ─── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Mensagens", value: stats?.messages_total ?? 0, icon: MessageSquare, color: "text-primary" },
          { label: "Servidores", value: stats?.servers_total ?? 0, icon: Server, color: "text-emerald-400" },
          { label: "Amigos", value: friendsCount, icon: Users, color: "text-amber-400" },
          { label: "XP", value: totalXp, icon: Zap, color: "text-violet-400" },
        ].map((item, i) => (
          <Card key={i} className="rounded-xl border-0 bg-card/30 backdrop-blur p-2.5 text-center hover:bg-card/50 transition-colors">
            <item.icon className={`h-4 w-4 mx-auto mb-1 ${item.color}`} />
            <p className="text-sm font-bold tabular-nums leading-tight">{item.value.toLocaleString("pt-BR")}</p>
            <p className="text-[9px] text-muted-foreground/50 leading-tight truncate">{item.label}</p>
          </Card>
        ))}
      </div>

      {/* ─── XP per Server (expandable) ─── */}
      {serverXp.length > 0 && (
        <Card className="rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg overflow-hidden">
          <div className="p-3.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400" />
              XP por Servidor
            </h4>
          </div>
          <div className="divide-y divide-border/20">
            {serverXp.slice(0, 5).map((entry: any) => {
              const sv = entry.servers;
              const level = Math.floor(Math.sqrt(entry.xp / 10));
              const nextXp = (level + 1) ** 2 * 10;
              const progress = Math.min(entry.xp / nextXp, 1);
              return (
                <Link key={sv?.id || Math.random()} to={sv ? "/app/servers/$serverId" : "#"} params={sv ? { serverId: sv.id } : undefined as any}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-accent/20 transition-colors ${!sv ? "pointer-events-none" : ""}`}>
                  {sv?.icon_url ? (
                    <img src={sv.icon_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0 ring-1 ring-border/10" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-border/10 grid place-items-center font-bold text-primary text-[10px] shrink-0">
                      {sv?.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium truncate">{sv?.name || "—"}</p>
                      <span className="text-[11px] font-mono text-muted-foreground/60 shrink-0">{entry.xp} XP</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-accent/40 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground/50 shrink-0">Nv.{level}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          {serverXp.length > 5 && (
            <button onClick={() => setActiveTab("xp")}
              className="w-full text-center text-[11px] text-muted-foreground/50 hover:text-foreground py-2.5 bg-accent/10 hover:bg-accent/20 transition-colors font-medium">
              Ver todos os {serverXp.length} servidores
            </button>
          )}
        </Card>
      )}

      {serverXp.length === 0 && (
        <button onClick={() => {}} className="w-full text-center text-xs text-muted-foreground/50 py-4 italic">
          Nenhum XP acumulado ainda
        </button>
      )}

      {/* ─── About tab content (only visible when "about" tab is active on mobile) ─── */}
      {/* Hidden on desktop since info is already in the card */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-9 bg-accent/50 p-0.5 rounded-xl md:hidden">
          <TabsTrigger value="about" className="text-xs data-[state=active]:bg-background rounded-lg">Sobre</TabsTrigger>
          <TabsTrigger value="servers" className="text-xs data-[state=active]:bg-background rounded-lg">Servidores</TabsTrigger>
          <TabsTrigger value="xp" className="text-xs data-[state=active]:bg-background rounded-lg">XP</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="mt-3 md:hidden">
          <Card className="rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5">
              <Activity className="h-3 w-3" /> Atividade
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: MessageSquare, c: "bg-primary/10", label: "Mensagens", value: stats?.messages_total ?? 0 },
                { icon: Server, c: "bg-emerald-500/10", label: "Servidores", value: stats?.servers_total ?? 0 },
                { icon: Star, c: "bg-amber-500/10", label: "XP", value: totalXp, suffix: " XP" },
                { icon: Clock, c: "bg-blue-500/10", label: "Membro há", value: profile.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0, suffix: "d" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl bg-accent/20 p-2.5 border border-border/20">
                  <div className={`h-8 w-8 rounded-lg ${item.c} grid place-items-center shrink-0`}>
                    <item.icon className="h-4 w-4 text-inherit" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground/60">{item.label}</p>
                    <p className="text-sm font-bold tabular-nums">{item.value}{(item as any).suffix || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="mt-3 md:hidden">
          <Card className="rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5">
              <Server className="h-3 w-3" /> Servidores
            </h4>
            {servers.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic py-4 text-center">Nenhum servidor em comum.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {servers.map((s) => (
                  <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }}
                    className="flex items-center gap-2.5 rounded-lg bg-accent/20 hover:bg-accent/40 p-2 transition-colors group">
                    {s.icon_url ? (
                      <img src={s.icon_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center font-bold text-primary text-xs shrink-0">{s.name[0]?.toUpperCase()}</div>
                    )}
                    <p className="text-xs font-medium truncate group-hover:text-foreground transition-colors">{s.name}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="xp" className="mt-3 md:hidden">
          <Card className="rounded-2xl border-0 bg-card/40 backdrop-blur shadow-lg p-3.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2.5 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-amber-400" /> XP por Servidor
            </h4>
            {serverXp.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic py-4 text-center">Nenhum XP acumulado ainda.</p>
            ) : (
              <div className="space-y-1.5">
                {serverXp.map((entry: any) => {
                  const sv = entry.servers;
                  const level = Math.floor(Math.sqrt(entry.xp / 10));
                  const nextXp = (level + 1) ** 2 * 10;
                  const progress = Math.min(entry.xp / nextXp, 1);
                  return (
                    <Link key={sv?.id || Math.random()} to={sv ? "/app/servers/$serverId" : "#"} params={sv ? { serverId: sv.id } : undefined as any}
                      className={`flex items-center gap-2.5 rounded-lg hover:bg-accent/20 p-2 transition-colors ${!sv ? "pointer-events-none" : ""}`}>
                      {sv?.icon_url ? (
                        <img src={sv.icon_url} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 grid place-items-center font-bold text-primary text-xs shrink-0">{sv?.name?.[0]?.toUpperCase() || "?"}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium truncate">{sv?.name || "—"}</p>
                          <span className="text-[10px] font-mono text-muted-foreground/50">{entry.xp} XP</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1 bg-accent/40 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${progress * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground/50">Lv.{level}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
