import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Loader2, Globe } from "lucide-react";
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
    const { error } = await supabase.from("server_members").upsert({ server_id: id, user_id: user.id, level: 1 }, { onConflict: "server_id, user_id", ignoreDuplicates: true });
    setJoining(null);
    if (error && (error as any).code !== "23505") return toast.error(error.message);
    toast.success("Entrou na panela!");
    router.navigate({ to: "/app/servers/$serverId", params: { serverId: id } });
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-10 space-y-6">
      <section className="rounded-[2rem] border border-border bg-gradient-to-br from-slate-950/80 via-background to-slate-950/40 p-6 shadow-sm shadow-slate-950/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-primary/80">Descobrir panelas</p>
            <h1 className="text-3xl font-bold tracking-tight">Encontre comunidades públicas com estilo.</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Acesse servidores ativos, com banner e cultura própria. Filtre por nome e entre direto nas panelas mais quentes.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-3xl border border-border bg-background/90 p-4 text-sm">
              <p className="text-muted-foreground uppercase tracking-[.2em] text-[10px]">Mais populares</p>
              <p className="mt-1 font-semibold">Server público com fila ativa</p>
            </div>
            <div className="rounded-3xl border border-border bg-background/90 p-4 text-sm">
              <p className="text-muted-foreground uppercase tracking-[.2em] text-[10px]">Visibilidade</p>
              <p className="mt-1 font-semibold">Todos podem entrar</p>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome…" className="pl-9 h-11" />
      </form>

      {loading ? (
        <Card className="p-8 text-center text-muted-foreground">Carregando…</Card>
      ) : servers.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Nenhuma panela pública encontrada.</Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {servers.map((s) => {
            const joined = myIds.has(s.id);
            return (
              <Card key={s.id} className="overflow-hidden border border-border bg-background transition hover:-translate-y-1 hover:shadow-lg">
                <div className="relative h-36 bg-slate-950/5">
                  {s.banner_url ? (
                    <img src={s.banner_url} alt="banner" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/20 via-transparent to-slate-900/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-background/90 text-lg font-semibold text-primary ring-1 ring-border overflow-hidden">
                        {s.icon_url ? <img src={s.icon_url} alt="ícone" className="h-full w-full object-cover" /> : s.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-white truncate">{s.name}</h3>
                        {s.slug && <p className="text-[11px] text-white/70 truncate font-mono">@{s.slug}</p>}
                      </div>
                    </div>
                    <Badge variant="outline" className="border-white/20 text-white/80 bg-black/30">{s.member_count} membros</Badge>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-muted-foreground">{s.privacy === "private" ? "Privado" : "Público"}</Badge>
                    {s.description ? <Badge variant="outline" className="text-muted-foreground">{s.description.length > 40 ? `${s.description.slice(0, 40)}…` : s.description}</Badge> : null}
                  </div>
                  {s.description ? <p className="text-sm text-muted-foreground line-clamp-3">{s.description}</p> : <p className="text-sm text-muted-foreground">Sem descrição disponível.</p>}
                  <div className="flex items-center justify-between gap-3">
                    {joined ? (
                      <Button variant="outline" className="w-full" onClick={() => router.navigate({ to: "/app/servers/$serverId", params: { serverId: s.id } })}>Abrir</Button>
                    ) : (
                      <Button className="w-full" disabled={joining === s.id} onClick={() => join(s.id)}>
                        {joining === s.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Entrar
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
