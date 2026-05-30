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
  ArrowLeft, Calendar, AtSign, MessageSquare, Activity,
  Server, Medal, Star, Users, MapPin,
  Globe, Github, Shield, Sparkles, Clock, Zap,
  Linkedin, ExternalLink, Trophy,
} from "lucide-react";

export const Route = createFileRoute("/app/u/$slug")({
  component: PublicProfile,
});

const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
  online: { label: "Online", color: "bg-emerald-500", dot: "bg-emerald-500" },
  idle: { label: "Ausente", color: "bg-yellow-500", dot: "bg-yellow-500" },
  dnd: { label: "Ocupado", color: "bg-red-500", dot: "bg-red-500" },
  offline: { label: "Offline", color: "bg-muted-foreground/30", dot: "bg-muted-foreground/30" },
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

      // Servers (mutual if logged in)
      if (user) {
        const { data: mems } = await supabase.from("server_members").select("server_id").eq("user_id", uid);
        if (mems?.length && !cancelled) {
          const ids = mems.map((m) => m.server_id);
          const { data: sv } = await supabase.from("servers").select("id, name, icon_url, privacy").in("id", ids);
          if (!cancelled) setServers(sv ?? []);
        }
      }

      // Presence
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

  // ---- 404 ----
  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="h-20 w-20 rounded-full bg-muted grid place-items-center mb-4">
          <Users className="h-10 w-10 text-muted-foreground/40" />
        </div>
        <h2 className="text-xl font-bold mb-1">Usuário não encontrado</h2>
        <p className="text-sm text-muted-foreground mb-6">Ninguém com o username ou ID &ldquo;{slug}&rdquo; foi encontrado.</p>
        <Link to=".."><Button variant="outline" className="gap-1.5"><ArrowLeft className="h-4 w-4" /> Voltar</Button></Link>
      </div>
    );
  }

  // ---- Skeleton ----
  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 animate-pulse">
        <div className="h-4 w-16 bg-muted rounded" />
        <Card className="overflow-hidden border-0 shadow-lg">
          <div className="h-40 md:h-48 bg-muted" />
          <div className="px-5 md:px-8 pb-6 -mt-16 md:-mt-20">
            <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
              <div className="h-28 w-28 md:h-32 md:w-32 rounded-2xl bg-muted ring-4 ring-card" />
              <div className="flex-1 pt-2 md:pb-2 w-full space-y-3">
                <div className="h-6 w-48 bg-muted rounded" />
                <div className="h-4 w-32 bg-muted rounded" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const calcLevel = (xp: number) => Math.floor(Math.sqrt(xp / 10));
  const st = STATUS_CFG[status] || STATUS_CFG.offline;
  const totalXp = serverXp.reduce((s, x) => s + x.xp, 0);
  const socialLinks = profile.social_links as Record<string, string> | null;
  const socialIcon: Record<string, typeof Globe> = { github: Github, twitter: Globe, instagram: Globe, linkedin: Linkedin };

  return (
    <div className="max-w-3xl mx-auto p-3 md:p-8 space-y-4 md:space-y-5">
      <Link to=".." className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar
      </Link>

      {/* ─── Profile Card ─── */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="h-36 md:h-52 relative overflow-hidden bg-gradient-to-br from-indigo-600/60 via-violet-600/30 to-purple-900/40"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}>
          {!profile.banner_url && (
            <div className="absolute inset-0 opacity-20">
              <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
            </div>
          )}
        </div>

        <div className="px-4 md:px-8 pb-5 md:pb-7 -mt-16 md:-mt-24 relative z-10">
          {/* Avatar + Name row */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 md:h-32 md:w-32 ring-4 ring-card shadow-2xl rounded-2xl md:rounded-3xl">
                <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="text-2xl md:text-4xl font-bold bg-gradient-to-br from-primary to-violet-600 text-white">
                  {profile.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-card ${st.dot}`} />
            </div>

            <div className="flex-1 pt-1 md:pb-2 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap">
                <div className="text-xl md:text-3xl font-bold flex items-center gap-2 flex-wrap">
                  <UsernameBadge profile={profile} roles={roles} />
                  {profile.current_plan === "pro" && (
                    <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 gap-1 text-[10px] px-2 py-0.5">
                      <Sparkles className="h-3 w-3" /> PRO
                    </Badge>
                  )}
                </div>
                {targetId && !isOwn && <FriendButton targetUserId={targetId} />}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-muted-foreground/80">
                <span className="flex items-center gap-1"><AtSign className="h-3.5 w-3.5" />@{profile.username}</span>
                <span className="hidden sm:inline text-muted-foreground/30">·</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Membro desde {new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
                <span className="hidden sm:inline text-muted-foreground/30">·</span>
                <span className={`flex items-center gap-1 ${status === "online" ? "text-emerald-500" : status === "idle" ? "text-yellow-500" : status === "dnd" ? "text-red-500" : "text-muted-foreground/50"}`}>
                  <span className={`h-2 w-2 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
              </div>
            </div>
          </div>

          {/* Status text */}
          {statusText && (
            <div className="mt-2.5 flex items-center gap-2 text-sm text-muted-foreground/70 bg-accent/30 rounded-xl px-3.5 py-2 border border-border/40 w-fit max-w-full">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span className="truncate italic">&ldquo;{statusText}&rdquo;</span>
            </div>
          )}

          {/* Roles + Bio */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {roles.map((r) => (
              <Badge key={r}
                variant={r === "ceo" || r === "admin" ? "default" : "secondary"}
                className={`text-[10px] uppercase tracking-wider gap-1 px-2.5 py-0.5 border-0 ${
                  r === "ceo" ? "bg-gradient-to-r from-red-600 to-orange-500 text-white" :
                  r === "admin" ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white" :
                  "bg-accent/70 text-muted-foreground"
                }`}>
                {r === "ceo" ? <Medal className="h-3 w-3" /> : r === "admin" ? <Shield className="h-3 w-3" /> : null}
                {r}
              </Badge>
            ))}
          </div>

          {profile.bio && (
            <div className="mt-3 prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-a:text-primary prose-img:rounded-lg bg-card/50 rounded-xl p-3.5 border border-border/50">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{profile.bio}</ReactMarkdown>
            </div>
          )}

          {/* Social links */}
          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {Object.entries(socialLinks).map(([platform, url]) => {
                const Icon = socialIcon[platform] || Globe;
                return (
                  <a key={platform} href={typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://")) ? url : `https://${platform}.com/${url}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs bg-accent/40 hover:bg-accent/70 text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 border border-border/50 transition-all">
                    <Icon className="h-3.5 w-3.5" />
                    {url}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {[
          { icon: MessageSquare, color: "from-primary/20 to-primary/5", iconColor: "text-primary", label: "Mensagens", value: stats?.messages_total ?? 0 },
          { icon: Server, color: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500", label: "Servidores", value: stats?.servers_total ?? 0 },
          { icon: Users, color: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-500", label: "Amigos", value: friendsCount },
          { icon: Zap, color: "from-violet-500/20 to-violet-500/5", iconColor: "text-violet-500", label: "XP total", value: totalXp },
        ].map((item, i) => (
          <Card key={i} className="p-3 md:p-4 flex items-center gap-3 md:gap-3.5 border-0 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-gradient-to-br from-card to-accent/20">
            <div className={`h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-br ${item.color} grid place-items-center shrink-0`}>
              <item.icon className={`h-[18px] w-[18px] md:h-5 md:w-5 ${item.iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg md:text-xl font-bold tabular-nums leading-tight">{item.value.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground/70 leading-tight truncate">{item.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── Tabs ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-10 md:h-11 bg-accent/50 p-1">
          <TabsTrigger value="about" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background"><Activity className="h-3.5 w-3.5 md:h-4 md:w-4" /> Sobre</TabsTrigger>
          <TabsTrigger value="servers" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background"><Server className="h-3.5 w-3.5 md:h-4 md:w-4" /> Servidores</TabsTrigger>
          <TabsTrigger value="xp" className="gap-1.5 text-xs md:text-sm data-[state=active]:bg-background"><Star className="h-3.5 w-3.5 md:h-4 md:w-4" /> XP</TabsTrigger>
        </TabsList>

        {/* ─── About ─── */}
        <TabsContent value="about" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <Card className="p-4 md:p-6 border-0 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm md:text-base">
              <Activity className="h-4 w-4 text-primary" /> Atividade
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              {[
                { icon: MessageSquare, color: "bg-primary/10", iconColor: "text-primary", label: "Mensagens enviadas", value: stats?.messages_total ?? 0, suffix: "" },
                { icon: Server, color: "bg-emerald-500/10", iconColor: "text-emerald-500", label: "Servidores que participa", value: profile.server_count ?? stats?.servers_total ?? 0, suffix: "" },
                { icon: Star, color: "bg-amber-500/10", iconColor: "text-amber-500", label: "XP acumulado", value: totalXp, suffix: " XP" },
                { icon: Users, color: "bg-violet-500/10", iconColor: "text-violet-500", label: "Amigos", value: friendsCount, suffix: "" },
                { icon: Clock, color: "bg-blue-500/10", iconColor: "text-blue-500", label: "Membro há", value: profile.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0, suffix: " dias" },
                { icon: MapPin, color: "bg-rose-500/10", iconColor: "text-rose-500", label: "Última atualização", value: profile.updated_at ? new Date(profile.updated_at).toLocaleDateString("pt-BR") : "—", suffix: "" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-accent/20 p-3 border border-border/30">
                  <div className={`h-9 w-9 rounded-lg ${item.color} grid place-items-center shrink-0`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground/70">{item.label}</p>
                    <p className="font-semibold tabular-nums">{item.value}{item.suffix}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* ─── Servers ─── */}
        <TabsContent value="servers" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <Card className="p-4 md:p-6 border-0 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm md:text-base">
              <Server className="h-4 w-4 text-primary" /> Servidores
              {servers.length > 0 && <span className="text-xs font-normal text-muted-foreground/60">({servers.length})</span>}
            </h3>
            {servers.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground/60">
                <Server className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">{isOwn ? "Você não entrou em nenhum servidor ainda." : "Nenhum servidor em comum."}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {servers.map((s) => (
                  <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }}
                    className="flex items-center gap-3 rounded-xl bg-accent/20 hover:bg-accent/50 p-3 border border-border/30 hover:border-border/60 transition-all group">
                    {s.icon_url ? (
                      <img src={s.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-1 ring-border/30 group-hover:ring-primary/30 transition-all" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-border/30 grid place-items-center font-bold text-primary text-sm group-hover:ring-primary/30 transition-all">
                        {s.name[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate group-hover:text-foreground transition-colors">{s.name}</p>
                      <p className="text-xs text-muted-foreground/60">{s.privacy === "private" ? "Privado" : "Público"}</p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ─── XP ─── */}
        <TabsContent value="xp" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <Card className="p-4 md:p-6 border-0 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm md:text-base">
              <Star className="h-4 w-4 text-amber-500" /> XP por Servidor
              {serverXp.length > 0 && <span className="text-xs font-normal text-muted-foreground/60">({totalXp} total)</span>}
            </h3>
            {serverXp.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground/60">
                <Trophy className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm font-medium">Nenhum XP acumulado ainda.</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Participe de servidores para ganhar XP!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {serverXp.map((entry: any) => {
                  const sv = entry.servers;
                  const level = calcLevel(entry.xp);
                  const nextXp = (level + 1) ** 2 * 10;
                  const progress = Math.min(entry.xp / nextXp, 1);
                  return (
                    <Link key={sv?.id || Math.random()} to={sv ? "/app/servers/$serverId" : "#"} params={sv ? { serverId: sv.id } : undefined as any}
                      className={`flex items-center gap-3 p-2.5 md:p-3 rounded-xl hover:bg-accent/30 transition-all group border border-transparent hover:border-border/30 ${!sv ? "pointer-events-none" : ""}`}>
                      {sv?.icon_url ? (
                        <img src={sv.icon_url} alt="" className="h-10 w-10 md:h-12 md:w-12 rounded-xl object-cover ring-1 ring-border/20 group-hover:ring-primary/30 transition-all" />
                      ) : (
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-border/20 grid place-items-center font-bold text-primary text-base md:text-lg">
                          {sv?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm truncate">{sv?.name || "Servidor desconhecido"}</p>
                          <span className="text-xs font-mono font-semibold text-muted-foreground/70">{entry.xp} XP</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1.5 bg-primary/10 rounded-full px-2 py-0.5">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="text-[11px] font-bold tabular-nums text-amber-500">Nível {level}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-accent/50 rounded-full mt-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress * 100}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 mt-0.5">{entry.xp} / {nextXp} XP para o nível {level + 1}</p>
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
