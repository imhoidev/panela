import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, isStaff, isCeo, isCooOrAbove, type AppRole } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, Crown, Loader2, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/app/admin")({
  head: () => ({ meta: [{ title: "Painel Staff — PANELA" }] }),
  component: AdminPanel,
});

type SubRow = { id: string; user_id: string; plan: string; status: string; contact_method: string | null; contact_value: string | null; notes: string | null; created_at: string; profile?: { username: string; display_name: string | null } | null };
type ProfileRow = { id: string; username: string; display_name: string | null; current_plan: string; created_at: string };

function AdminPanel() {
  const { roles, ready } = useAuth();
  const canApprove = isCooOrAbove(roles);
  const canGrantRoles = isCeo(roles);
  const allowed = isStaff(roles);

  const [subs, setSubs] = useState<SubRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id,username,display_name,current_plan,created_at").order("created_at", { ascending: false }).limit(100),
    ]);
    const subRows = (s ?? []) as SubRow[];
    if (subRows.length) {
      const ids = Array.from(new Set(subRows.map((x) => x.user_id)));
      const { data: prof } = await supabase.from("profiles").select("id,username,display_name").in("id", ids);
      const map = new Map((prof ?? []).map((p: any) => [p.id, p]));
      subRows.forEach((x) => { x.profile = map.get(x.user_id) ?? null; });
    }
    setSubs(subRows);
    setProfiles((p ?? []) as ProfileRow[]);
    setLoading(false);
  }
  useEffect(() => { if (allowed) reload(); }, [allowed]);

  async function setSubStatus(id: string, status: "active" | "rejected" | "canceled") {
    const update: any = { status, reviewed_at: new Date().toISOString() };
    if (status === "active") {
      update.starts_at = new Date().toISOString();
      update.ends_at = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
    }
    const { error } = await supabase.from("subscriptions").update(update).eq("id", id);
    if (error) return toast.error(error.message);

    if (status === "active") {
      const sub = subs.find((x) => x.id === id);
      if (sub) {
        await supabase.from("profiles").update({ current_plan: "pro", updated_at: new Date().toISOString() }).eq("id", sub.user_id);
      }
    }

    toast.success("Atualizado");
    reload();
  }
  async function grantRole(userId: string, role: AppRole) {
    setGranting(userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    setGranting(null);
    if (error) return toast.error(error.message);
    toast.success(`Cargo ${role} concedido`);
  }
  async function revokeRole(userId: string, role: AppRole) {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
    if (error) return toast.error(error.message);
    toast.success("Cargo removido");
  }

  if (!ready) return null;
  if (!allowed) return (
    <div className="max-w-md mx-auto p-10 text-center space-y-3">
      <ShieldOff className="h-10 w-10 mx-auto text-muted-foreground" />
      <h1 className="text-xl font-semibold">Acesso restrito</h1>
      <p className="text-sm text-muted-foreground">Esta área é só para staff (admin / COO / CEO).</p>
    </div>
  );

  const filtered = profiles.filter((p) => !search || p.username.toLowerCase().includes(search.toLowerCase()) || (p.display_name ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-10 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Crown className="h-6 w-6 text-gold" />Painel Staff</h1>
          <p className="text-sm text-muted-foreground">{roles.join(", ").toUpperCase()}</p>
        </div>
        <Button variant="outline" onClick={reload} disabled={loading}>{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Atualizar</Button>
      </header>

      <Tabs defaultValue="subs">
        <TabsList>
          <TabsTrigger value="subs">Pedidos PRO ({subs.filter(s => s.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="subs" className="space-y-3 mt-4">
          {subs.length === 0 && <p className="text-muted-foreground text-sm">Nenhum pedido ainda.</p>}
          {subs.map((s) => (
            <Card key={s.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">@{s.profile?.username ?? s.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{s.contact_method}: {s.contact_value}</div>
                {s.notes && <div className="text-xs text-muted-foreground mt-1">"{s.notes}"</div>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(s.created_at).toLocaleString()}</div>
              </div>
              <Badge variant={s.status === "active" ? "default" : s.status === "pending" ? "outline" : "destructive"}>{s.status}</Badge>
              {s.status === "pending" && canApprove && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setSubStatus(s.id, "active")}><Check className="h-4 w-4 mr-1" />Aprovar</Button>
                  <Button size="sm" variant="destructive" onClick={() => setSubStatus(s.id, "rejected")}><X className="h-4 w-4 mr-1" />Rejeitar</Button>
                </div>
              )}
              {s.status === "active" && canApprove && (
                <Button size="sm" variant="outline" onClick={() => setSubStatus(s.id, "canceled")}>Cancelar</Button>
              )}
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="users" className="space-y-3 mt-4">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por username ou nome…" />
          {filtered.map((p) => (
            <Card key={p.id} className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{p.display_name || p.username}</div>
                <div className="text-xs text-muted-foreground">@{p.username} · {new Date(p.created_at).toLocaleDateString()}</div>
              </div>
              <Badge variant="outline" className="uppercase">{p.current_plan}</Badge>
              {canGrantRoles && (
                <div className="flex gap-2 flex-wrap">
                  <Select disabled={granting === p.id} onValueChange={(v) => grantRole(p.id, v as AppRole)}>
                    <SelectTrigger className="w-[140px]"><SelectValue placeholder="Conceder cargo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coo">COO</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select onValueChange={(v) => revokeRole(p.id, v as AppRole)}>
                    <SelectTrigger className="w-[120px]"><SelectValue placeholder="Revogar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="coo">COO</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {!canGrantRoles && (
        <p className="text-xs text-muted-foreground">Apenas o CEO pode conceder ou revogar cargos globais.</p>
      )}
    </div>
  );
}
