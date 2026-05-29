import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsernameBadge } from "@/components/UsernameBadge";
import { LevelBadge } from "@/components/LevelBadge";
import { FriendButton } from "@/components/FriendButton";
import {
  ArrowLeft, Globe, Calendar, AtSign, MessageSquare, Activity,
  Server, Medal, Award, Star, TrendingUp, Hash, Users,
} from "lucide-react";

export const Route = createFileRoute("/app/profile/$slug")({
  component: PublicProfile,
});

function PublicProfile() {
  const { slug } = useParams({ from: "/app/profile/$slug" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [servers, setServers] = useState<any[]>([]);
  const [serverXp, setServerXp] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [activeTab, setActiveTab] = useState("about");
  const [targetId, setTargetId] = useState<string | null>(null);
  const isOwn = user?.id != null && (user.id === slug || user.id === targetId);

  useEffect(() => {
    if (!slug) return;
    setTargetId(null);
    let cancelled = false;
    async function load() {
      // Look up by username first (as slug), fallback to UUID
      let { data: profile } = await supabase.from("profiles").select("*").eq("username", slug).maybeSingle();
      if (!profile) {
        const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPat.test(slug)) {
          ({ data: profile } = await supabase.from("profiles").select("*").eq("id", slug).maybeSingle());
        }
      }
      if (cancelled || !profile) { if (!cancelled) setProfile(null); return; }
      const uid = profile.id;
      setProfile(profile);
      setTargetId(uid);

      supabase.from("user_roles").select("role").eq("user_id", uid).then(({ data }) => setRoles((data ?? []).map((r: any) => r.role)));
      supabase.from("profile_stats").select("*").eq("user_id", uid).maybeSingle().then(({ data }) => setStats(data));

      supabase.from("friends").select("id", { count: "exact", head: true })
        .or(`user_id.eq.${uid},friend_id.eq.${uid}`)
        .eq("status", "accepted")
        .then(({ count }) => setFriendsCount(count ?? 0));

      if (user) {
        supabase.from("server_members").select("server_id").eq("user_id", uid).then(async ({ data }) => {
          if (!data?.length) return;
          const ids = data.map((m) => m.server_id);
          const { data: sv } = await supabase.from("servers").select("id, name, icon_url, privacy").in("id", ids);
          if (!cancelled) setServers(sv ?? []);
        });
      }
      supabase.from("server_xp").select("xp, servers(name, icon_url, id)")
        .eq("user_id", uid).order("xp", { ascending: false }).limit(10)
        .then(({ data }) => { if (!cancelled) setServerXp(data ?? []); });
    }
    load();
    return () => { cancelled = true; };
  }, [slug, user?.id]);

  if (!profile) return <div className="p-8 text-muted-foreground text-center">Carregando…</div>;

  const calcLevel = (xp: number) => Math.floor(Math.sqrt(xp / 10));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-5">
      <Link to=".." className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {/* Profile Header */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-40 md:h-48 bg-gradient-to-br from-primary/40 via-gold/20 to-primary/10 relative"
          style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="px-5 md:px-8 pb-6 -mt-16 md:-mt-20">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6">
            <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-card shadow-xl rounded-2xl">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="text-3xl">{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 pt-2 md:pb-2 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="text-xl md:text-2xl font-bold">
                  <UsernameBadge profile={profile} roles={roles} />
                </div>
                {targetId && !isOwn && <FriendButton targetUserId={targetId} />}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><AtSign className="h-3.5 w-3.5" />@{profile.username}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {profile.current_plan === "pro" && <Badge variant="default" className="bg-gold text-gold-foreground gap-1"><Star className="h-3 w-3" />PRO</Badge>}
            {roles.map((r) => (
              <Badge key={r} variant={r === "ceo" ? "destructive" : r === "admin" ? "default" : "secondary"} className="text-[10px] uppercase">
                {r === "ceo" ? <Medal className="h-3 w-3 mr-1" /> : r === "admin" ? <Award className="h-3 w-3 mr-1" /> : null}
                {r}
              </Badge>
            ))}
          </div>

          {profile.bio && (
            <p className="text-sm mt-4 text-foreground/80 bg-accent/30 rounded-xl p-3 border border-border/50">{profile.bio}</p>
          )}

          {profile.social_links && (
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {(profile.social_links as any).twitter && (
                <a href={`https://twitter.com/${(profile.social_links as any).twitter}`} target="_blank"
                  className="flex items-center gap-1 hover:text-primary transition-colors">
                  <AtSign className="h-3 w-3" /> {(profile.social_links as any).twitter}
                </a>
              )}
              {(profile.social_links as any).instagram && (
                <a href={`https://instagram.com/${(profile.social_links as any).instagram}`} target="_blank"
                  className="flex items-center gap-1 hover:text-primary transition-colors">
                  <AtSign className="h-3 w-3" /> {(profile.social_links as any).instagram}
                </a>
              )}
              {(profile.social_links as any).github && (
                <a href={`https://github.com/${(profile.social_links as any).github}`} target="_blank"
                  className="flex items-center gap-1 hover:text-primary transition-colors">
                  <AtSign className="h-3 w-3" /> {(profile.social_links as any).github}
                </a>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 grid place-items-center"><MessageSquare className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-lg font-bold">{stats?.messages_total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Mensagens</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 grid place-items-center"><Server className="h-5 w-5 text-emerald-500" /></div>
          <div>
            <p className="text-lg font-bold">{stats?.servers_total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Servidores</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gold/15 grid place-items-center"><Users className="h-5 w-5 text-gold" /></div>
          <div>
            <p className="text-lg font-bold">{friendsCount}</p>
            <p className="text-xs text-muted-foreground">Amigos</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/15 grid place-items-center"><TrendingUp className="h-5 w-5 text-purple-500" /></div>
          <div>
            <p className="text-lg font-bold">{serverXp.reduce((s, x) => s + x.xp, 0)}</p>
            <p className="text-xs text-muted-foreground">XP total</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="about" className="gap-1.5"><Activity className="h-4 w-4" /> Sobre</TabsTrigger>
          <TabsTrigger value="servers" className="gap-1.5"><Server className="h-4 w-4" /> Servidores</TabsTrigger>
          <TabsTrigger value="xp" className="gap-1.5"><Star className="h-4 w-4" /> XP</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="space-y-4 mt-4">
          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Activity className="h-4 w-4 text-primary" /> Atividade Recente</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center"><MessageSquare className="h-4 w-4 text-primary" /></div>
                <span><strong className="text-foreground">{stats?.messages_total ?? 0}</strong> mensagens enviadas no total</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 grid place-items-center"><Server className="h-4 w-4 text-emerald-500" /></div>
                <span>Membro de <strong className="text-foreground">{stats?.servers_total ?? 0}</strong> servidores</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-gold/10 grid place-items-center"><Star className="h-4 w-4 text-gold" /></div>
                <span>Total de <strong className="text-foreground">{serverXp.reduce((s, x) => s + x.xp, 0)}</strong> XP acumulados</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <div className="h-8 w-8 rounded-lg bg-purple-500/10 grid place-items-center"><Users className="h-4 w-4 text-purple-500" /></div>
                <span><strong className="text-foreground">{friendsCount}</strong> amigos conectados</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="servers" className="space-y-4 mt-4">
          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Server className="h-4 w-4 text-primary" /> Servidores</h3>
            {servers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum servidor em comum.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {servers.map((s) => (
                  <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }}
                    className="flex items-center gap-2.5 rounded-lg bg-accent/30 p-2.5 hover:bg-accent/60 transition-colors">
                    {s.icon_url
                      ? <img src={s.icon_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                      : <div className="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center font-bold text-primary text-sm">{s.name[0]}</div>
                    }
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.privacy === "private" ? "🔒 Privado" : "🌍 Público"}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="xp" className="space-y-4 mt-4">
          <Card className="p-5">
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Star className="h-4 w-4 text-gold" /> XP por Servidor</h3>
            {serverXp.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum XP acumulado ainda.</p>
            ) : (
              <div className="space-y-3">
                {serverXp.map((entry: any) => {
                  const sv = entry.servers;
                  const level = calcLevel(entry.xp);
                  const nextXp = (level + 1) ** 2 * 10;
                  const progress = Math.min(entry.xp / nextXp, 1);
                  return (
                    <Link key={sv?.id} to="/app/servers/$serverId" params={{ serverId: sv.id }}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors">
                      {sv?.icon_url
                        ? <img src={sv.icon_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        : <div className="h-10 w-10 rounded-lg bg-primary/15 grid place-items-center font-bold text-primary">{sv?.name?.[0]}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{sv?.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <LevelBadge xp={entry.xp} size="sm" />
                        </div>
                        <div className="h-1.5 bg-accent rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">{entry.xp} XP</span>
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

