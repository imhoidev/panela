import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/discover")({
  head: () => ({ meta: [{ title: "Descobrir — PANELA" }] }),
  component: Discover,
});

function Discover() {
  const { user } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [servers, setServers] = useState<any[]>([]);
  const [myIds, setMyIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let query = supabase.from("servers").select("*").eq("privacy", "public").order("member_count", { ascending: false }).limit(50);
    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    const { data } = await query;
    setServers(data ?? []);
    if (user) {
      const { data: mem } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
      setMyIds(new Set((mem ?? []).map((m) => m.server_id)));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function join(id: string) {
    if (!user) return;
    setJoining(id);
    const { error } = await supabase.from("server_members").insert({ server_id: id, user_id: user.id, level: 1 });
    setJoining(null);
    if (error) return toast.error(error.message);
    toast.success("Entrou na panela!");
    router.navigate({ to: "/app/servers/$serverId", params: { serverId: id } });
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-10 space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Descobrir panelas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Comunidades públicas pra conhecer gente nova.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9 h-10" />
      </form>

      {loading ? <p className="text-muted-foreground">Carregando…</p> : servers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma panela pública encontrada.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {servers.map((s) => {
            const joined = myIds.has(s.id);
            return (
              <Card key={s.id} className="p-5 flex flex-col">
                {s.banner_url ? <img src={s.banner_url} alt="banner" className="h-28 w-full object-cover rounded-md mb-3" /> : null}
                <div className="flex items-center gap-3">
                  {s.icon_url
                    ? <img src={s.icon_url} className="h-12 w-12 rounded-xl object-cover" alt="" />
                    : <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center font-bold text-primary">{s.name[0]?.toUpperCase()}</div>}
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{s.name}</h3>
                    {s.slug && <p className="text-[11px] text-muted-foreground/80 truncate font-mono">@{s.slug}</p>}
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{s.member_count}</p>
                  </div>
                </div>
                {s.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-3 flex-1">{s.description}</p>}
                <div className="mt-4">
                  {joined ? (
                    <Button variant="outline" className="w-full" onClick={() => router.navigate({ to: "/app/servers/$serverId", params: { serverId: s.id } })}>Abrir</Button>
                  ) : (
                    <Button className="w-full" disabled={joining === s.id} onClick={() => join(s.id)}>
                      {joining === s.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Entrar
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
