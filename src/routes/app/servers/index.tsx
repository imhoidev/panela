import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Hash, Users, Loader2, AtSign, Camera } from "lucide-react";
import { toast } from "sonner";
import { slugify, isValidSlug } from "@/lib/slug";

export const Route = createFileRoute("/app/servers/")({
  head: () => ({ meta: [{ title: "Meus servidores — PANELA" }] }),
  component: ServersIndex,
});

function ServersIndex() {
  const { user } = useAuth();
  const router = useRouter();
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const autoSlug = useMemo(() => slugify(name) || "", [name]);
  const finalSlug = slugTouched ? slug : autoSlug;
  const slugOk = finalSlug === "" || isValidSlug(finalSlug);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: mem } = await supabase.from("server_members").select("server_id").eq("user_id", user.id);
    const ids = (mem ?? []).map((m) => m.server_id);
    if (!ids.length) { setServers([]); setLoading(false); return; }
    const { data } = await supabase.from("servers").select("*").in("id", ids).order("updated_at", { ascending: false });
    setServers(data ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user?.id]);

  async function create() {
    if (!user || !name.trim()) return;
    if (!slugOk) return toast.error("Slug inválido (use 2-32 chars, a-z, 0-9, -).");
    setCreating(true);
    const { data, error } = await supabase.from("servers").insert({
      owner_id: user.id, name: name.trim(), description: description.trim() || null, privacy,
      slug: finalSlug || null,
    }).select().single();
    if (error) {
      setCreating(false);
      if ((error as any).code === "23505") return toast.error("Esse slug já está em uso.");
      return toast.error(error.message);
    }
    // Upload icon if selected
    if (iconFile) {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const formData = new FormData();
      formData.append("file", iconFile);
      formData.append("server_id", data.id);
      await fetch(`${apiUrl}/api/upload-server-icon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: formData,
      });
    }
    setCreating(false);
    toast.success(`Servidor criado! @${data.slug}`);
    setOpen(false); setName(""); setSlug(""); setSlugTouched(false); setDescription("");
    setIconFile(null); setIconPreview(null);
    router.navigate({ to: "/app/servers/$serverId", params: { serverId: data.id } });
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meus servidores</h1>
          <p className="text-sm text-muted-foreground">Suas panelas pessoais. Crie, convide, converse.</p>
        </div>
        <ResponsiveDialog open={open} onOpenChange={setOpen}
          title="Criar servidor"
          trigger={<Button><Plus className="h-4 w-4 mr-1.5" />Novo servidor</Button>}>
          <div className="space-y-5">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/40 to-primary/10 ring-2 ring-border/40 grid place-items-center overflow-hidden">
                  {iconPreview ? (
                    <img src={iconPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Hash className="h-8 w-8 text-primary/60" />
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-background border border-border grid place-items-center cursor-pointer hover:bg-accent transition-colors shadow-sm">
                  <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) { setIconFile(f); setIconPreview(URL.createObjectURL(f)); }
                      e.target.value = "";
                    }} />
                </label>
                {iconPreview && (
                  <button onClick={() => { setIconFile(null); setIconPreview(null); }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive/80 text-destructive-foreground grid place-items-center text-[10px] hover:bg-destructive transition-colors shadow-sm">
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da panela</Label>
              <Input value={name} onChange={(e)=>setName(e.target.value)} maxLength={48}
                placeholder="Ex: Amigos do Churrasco" className="h-10" />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Slug (URL pública)</Label>
              <div className="relative">
                <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 h-10" value={finalSlug}
                  onChange={(e)=>{ setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                  maxLength={32} placeholder="amigos-do-churrasco" />
              </div>
              <p className={`text-xs ${slugOk ? "text-muted-foreground" : "text-destructive"}`}>
                panela.app/s/{finalSlug || "<gerado-automatico>"}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição</Label>
              <Textarea value={description} onChange={(e)=>setDescription(e.target.value)} maxLength={300} rows={3}
                placeholder="Um lugar pra gente se encontrar e conversar..." />
            </div>

            {/* Privacy + Create */}
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-semibold">Privacidade</Label>
                <Select value={privacy} onValueChange={(v: any) => setPrivacy(v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public"><span className="font-medium">Pública</span> — qualquer um entra</SelectItem>
                    <SelectItem value="private"><span className="font-medium">Privada</span> — só por convite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="h-10 flex-1" onClick={create}
                disabled={creating || !name.trim() || !slugOk}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
                {creating ? "Criando..." : "Criar panela"}
              </Button>
            </div>
          </div>
        </ResponsiveDialog>
      </div>

      {loading ? <p className="text-muted-foreground">Carregando…</p> :
        servers.length === 0 ? (
          <Card className="p-8 text-center space-y-3">
            <Hash className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Você ainda não está em nenhuma panela.</p>
            <div className="flex justify-center gap-2">
              <Button onClick={()=>setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Criar a primeira</Button>
              <Link to="/app/discover"><Button variant="outline">Descobrir públicas</Button></Link>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((s) => (
              <Link key={s.id} to="/app/servers/$serverId" params={{ serverId: s.id }}>
                <Card className="p-5 hover:border-primary/50 transition-colors h-full">
                  <div className="flex items-center gap-3">
                    {s.icon_url
                      ? <img src={s.icon_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
                      : <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center font-bold text-primary">{s.name[0]?.toUpperCase()}</div>
                    }
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{s.name}</h3>
                      {s.slug && <p className="text-[11px] text-muted-foreground/80 truncate">@{s.slug}</p>}
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{s.member_count} {s.privacy === "private" && "· privado"}</p>
                    </div>
                  </div>
                  {s.description && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{s.description}</p>}
                </Card>
              </Link>
            ))}
          </div>
        )
      }
    </div>
  );
}
