import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UsernameBadge } from "@/components/UsernameBadge";
import { ArrowLeft, Globe, Calendar, AtSign } from "lucide-react";

export const Route = createFileRoute("/app/profile/$userId")({
  component: PublicProfile,
});

function PublicProfile() {
  const { userId } = useParams({ from: "/app/profile/$userId" });
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [servers, setServers] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => setProfile(data));
    supabase.from("user_roles").select("role").eq("user_id", userId).then(({ data }) => setRoles((data ?? []).map((r: any) => r.role)));
    if (user) {
      supabase.from("server_members").select("server_id").eq("user_id", userId).then(async ({ data }) => {
        if (!data?.length) return;
        const ids = data.map((m) => m.server_id);
        const { data: sv } = await supabase.from("servers").select("id, name, icon_url").in("id", ids);
        setServers(sv ?? []);
      });
    }
  }, [userId]);

  if (!profile) return <div className="p-8 text-muted-foreground text-center">Carregando…</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-6">
      <Link to=".." className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <Card className="overflow-hidden">
        <div className="h-36 bg-gradient-to-r from-primary/30 to-gold/20" style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
        <div className="p-6 -mt-14 flex items-end gap-5">
          <Avatar className="h-24 w-24 ring-4 ring-card">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback>{profile.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 pb-1">
            <div className="text-xl">
              <UsernameBadge profile={profile} roles={roles} />
            </div>
            <div className="text-sm text-muted-foreground">@{profile.username}</div>
          </div>
        </div>
        <div className="px-6 pb-5 space-y-3">
          {profile.status_text && (
            <p className="text-sm text-muted-foreground italic">{profile.status_text}</p>
          )}
          {profile.bio && <p className="text-sm whitespace-pre-wrap">{profile.bio}</p>}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Entrou em {new Date(profile.created_at || Date.now()).toLocaleDateString("pt-BR")}</span>
            {profile.current_plan === "pro" && <Badge variant="default" className="text-[10px]">PRO</Badge>}
            {roles.map((r) => <Badge key={r} variant={r === "ceo" ? "destructive" : r === "admin" ? "default" : "secondary"} className="text-[10px]">{r}</Badge>)}
          </div>
          {profile.social_links && (
            <div className="flex gap-3 text-xs">
              {(profile.social_links as any).twitter && <span className="flex items-center gap-1 text-muted-foreground"><AtSign className="h-3 w-3" />{(profile.social_links as any).twitter}</span>}
              {(profile.social_links as any).instagram && <span className="flex items-center gap-1 text-muted-foreground"><AtSign className="h-3 w-3" />{(profile.social_links as any).instagram}</span>}
            </div>
          )}
        </div>
      </Card>

      {servers.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Globe className="h-4 w-4" /> Servidores em comum ({servers.length})</h3>
          <div className="flex flex-wrap gap-2">
            {servers.map((s) => (
              <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }}
                className="flex items-center gap-1.5 rounded-full bg-accent/50 px-3 py-1 text-xs hover:bg-accent transition-colors">
                {s.icon_url && <img src={s.icon_url} alt="" className="h-4 w-4 rounded" />}
                {s.name}
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
