import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Loader2, Globe, Sparkles, Compass, Gamepad2, Code2, Music2, Palette, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/discover")({
  head: () => ({ meta: [{ title: "Descobrir — PANELA" }] }),
  component: Discover,
});

const TAG_FILTERS = [
  { id: "all", label: "Todas", icon: Compass },
  { id: "gaming", label: "Games", icon: Gamepad2 },
  { id: "tech", label: "Tecnologia", icon: Code2 },
  { id: "music", label: "Música", icon: Music2 },
  { id: "art", label: "Arte & Design", icon: Palette },
  { id: "study", label: "Estudos", icon: GraduationCap },
];

function Discover() {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState("all");
  const [servers, setServers] = useState<any[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase.from("servers").select("*").eq("privacy", "public").order("member_count", { ascending: false }).limit(60);
    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    const { data } = await query;
    let filtered = data ?? [];
    if (activeTag !== "all") {
      filtered = filtered.filter((s) => s.focus_tags?.includes(activeTag) || s.description?.toLowerCase().includes(activeTag));
    }
    setServers(filtered);

    if (user) {
      const { data: mem } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
      setMyIds(new Set((mem ?? []).map((m) => m.server_id)));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id, activeTag]);

  async function join(id: string) {
    if (!user) return;
    setJoining(id);
    const { error } = await supabase.from("server_members").insert({ server_id: id, user_id: user.id, level: 1 });
    setJoining(null);
    if (error) return toast.error(error.message);
    toast.success("Você entrou na panela!");
    router.navigate({ to: "/app/servers/$serverId", params: { serverId: id } });
  }

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-background to-card/60 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Descobrir Comunidades
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Explore novas panelas e faça conexões em tempo real.</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Encontre comunidades ativas de games, desenvolvimento, música e interesses diversos. Conecte-se com pessoas incríveis.
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar comunidades por nome..." className="pl-10 h-11 bg-card/60" />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TAG_FILTERS.map((t) => {
            const Icon = t.icon;
            const active = activeTag === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTag(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 ${
                  active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground border border-border/40"
                }`}>
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-card/30 border border-border/40 animate-pulse" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground/60 border-dashed space-y-2">
          <Globe className="h-10 w-10 mx-auto opacity-30" />
          <p className="text-sm font-medium">Nenhuma panela encontrada para a busca.</p>
          <p className="text-xs">Tente buscar por outros termos ou categorias.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((s) => {
            const joined = myIds.has(s.id);
            return (
              <Card key={s.id} className="overflow-hidden border border-border/60 bg-card/60 hover:bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 flex flex-col group">
                <div className="relative h-32 bg-slate-950/40 shrink-0">
                  {s.banner_url ? (
                    <img src={s.banner_url} alt="banner" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 via-card to-background" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />

                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-11 w-11 rounded-xl bg-card/90 backdrop-blur border border-border/60 shadow-lg overflow-hidden flex items-center justify-center font-bold text-primary text-base shrink-0">
                        {s.icon_url ? <img src={s.icon_url} alt="" className="h-full w-full object-cover" /> : s.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-foreground truncate drop-shadow-sm">{s.name}</h3>
                        {s.slug && <p className="text-[10px] text-muted-foreground/80 font-mono truncate">@{s.slug}</p>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-medium backdrop-blur bg-background/80 shrink-0">
                      <Users className="h-3 w-3 mr-1" />{s.member_count}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">
                    {s.description || "Comunidade acolhedora no PANELA. Venha trocar ideias!"}
                  </p>

                  <div className="pt-2">
                    {joined ? (
                      <Button variant="secondary" className="w-full h-9 text-xs font-semibold" onClick={() => router.navigate({ to: "/app/servers/$serverId", params: { serverId: s.id } })}>
                        Entrar na Panela
                      </Button>
                    ) : (
                      <Button className="w-full h-9 text-xs font-semibold shadow-md shadow-primary/10" disabled={joining === s.id} onClick={() => join(s.id)}>
                        {joining === s.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : "Participar da Comunidade"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
