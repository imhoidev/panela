import { useState, useRef, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerXP } from "@/hooks/servers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LevelBadge } from "@/components/LevelBadge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Globe, Lock, AtSign, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";
import { useUpdateServer, useDeleteServer } from "@/hooks/servers";

export function ServerOverviewTab({
  server, serverId, isOwner, canManage, onServerUpdate,
}: {
  server: any; serverId: string; isOwner: boolean; canManage: boolean;
  onServerUpdate: (s: any) => void;
}) {
  const router = useRouter();
  const [editName, setEditName] = useState(server.name);
  const [editDesc, setEditDesc] = useState(server.description ?? "");
  const [editPrivacy, setEditPrivacy] = useState(server.privacy || "public");
  const [newSlug, setNewSlug] = useState(server.slug ?? "");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const updateServer = useUpdateServer(serverId);
  const deleteServer = useDeleteServer(serverId);
  const { user } = useAuth();
  const { data: serverXP } = useServerXP(serverId, user?.id);
  const xpCurrent = serverXP?.xp ?? 0;
  const xpLevel = serverXP?.level ?? 0;
  const xpNext = serverXP?.nextXp ?? 10;
  const xpLevelBase = xpLevel ** 2 * 10;
  const xpTowardsNext = Math.max(0, xpCurrent - xpLevelBase);
  const xpNextThreshold = Math.max(1, xpNext - xpLevelBase);
  const xpProgress = serverXP?.progress ?? (xpNextThreshold > 0 ? xpTowardsNext / xpNextThreshold : 0);

  async function uploadIcon(file: File) {
    if (uploadingIcon) return;
    setUploadingIcon(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("server_id", serverId);
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/upload-server-icon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload falhou"); }
      const { url } = await res.json();
      await supabase.from("servers").update({ icon_url: url }).eq("id", serverId);
      onServerUpdate({ ...server, icon_url: url });
      toast.success("Ícone atualizado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingIcon(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) uploadIcon(file);
  }, [serverId]);

  async function uploadBanner(file: File) {
    if (uploadingBanner) return;
    setUploadingBanner(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("server_id", serverId);
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/upload-server-banner`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload falhou"); }
      const { url } = await res.json();
      await supabase.from("servers").update({ banner_url: url }).eq("id", serverId);
      onServerUpdate({ ...server, banner_url: url });
      toast.success("Banner atualizado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleDelete() {
    if (!confirm("TEM CERTEZA? Esta ação é irreversível.")) return;
    if (!confirm("Sério mesmo? Confirme.")) return;
    deleteServer.mutate(undefined, {
      onSuccess: () => router.navigate({ to: "/app/servers" }),
    });
  }

  return (
    <div className="space-y-6">
      {/* Server Header Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-slate-900/50 to-background">
        <div className="relative h-48 sm:h-56 bg-slate-950/30">
          {server.banner_url ? (
            <img src={server.banner_url} alt="banner" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-emerald-950/15" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-white/10 bg-white/5 flex items-center justify-center text-2xl font-bold text-white/90 shadow-xl">
                {server.icon_url ? (
                  <img src={server.icon_url} alt="Ícone do servidor" className="h-full w-full object-cover" />
                ) : (
                  <span>{server.name[0]?.toUpperCase()}</span>
                )}
              </div>

              <div className="min-w-0 text-white flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{server.name}</h2>
                <p className="mt-2 text-sm text-white/75 line-clamp-2">
                  {server.description || "Personalize seu servidor com banner, descrição e configurações avançadas."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Badge variant="outline" className="border-white/30 text-white/90 bg-white/10 backdrop-blur-sm font-medium">
                    {server.privacy === "private" ? "🔒 Privado" : "🌐 Público"}
                  </Badge>
                  <Badge variant="outline" className="border-white/30 text-white/90 bg-white/10 backdrop-blur-sm font-medium">
                    👥 {server.member_count} {server.member_count === 1 ? "membro" : "membros"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {serverXP && (
        <Card className="p-4 border border-border/70 bg-card/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold">XP no servidor</p>
              <p className="text-xs text-muted-foreground">Seu progresso atual no servidor {server.name}.</p>
            </div>
            <LevelBadge xp={xpCurrent} size="md" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] items-center">
            <ProgressBar value={xpTowardsNext} max={xpNextThreshold} label={`Nível ${xpLevel} → ${xpLevel + 1}`} />
            <div className="text-right text-xs text-muted-foreground">
              <div>XP atual: <span className="font-semibold text-foreground">{xpCurrent}</span></div>
              <div>Faltam: <span className="font-semibold text-foreground">{xpNextThreshold - xpTowardsNext}</span> XP</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1.2fr]">
        {/* Configurações principais */}
        <Card className="p-6 space-y-6 border border-border/80 bg-card/80 backdrop-blur-sm">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Informações principais</h3>
            <p className="text-sm text-muted-foreground">Atualize nome, descrição e visibilidade do servidor.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Nome do servidor</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} className="h-11 text-sm" placeholder="Nome do servidor" />
              <p className="text-xs text-muted-foreground">{editName.length}/48 caracteres</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Slug público</Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-lg border border-border bg-background/80 px-4 py-2.5 text-xs text-muted-foreground font-mono truncate">
                  panela.app/s/{server.slug || "seu-slug"}
                </div>
                <Button onClick={() => updateServer.mutate({ slug: slugify(newSlug) }, {
                    onSuccess: () => onServerUpdate({ ...server, slug: slugify(newSlug) }),
                  })}
                  disabled={updateServer.isPending || !newSlug.trim() || slugify(newSlug) === server.slug} 
                  size="sm" className="h-11 px-4">
                  Salvar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Descrição</Label>
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={500} rows={5} 
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" 
              placeholder="Descreva seu servidor, sua comunidade e o que a torna especial..." />
            <p className="text-xs text-muted-foreground">{editDesc.length}/500 caracteres</p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Visibilidade</Label>
            <div className="grid grid-cols-2 gap-3">
              {(["public", "private"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setEditPrivacy(v)}
                  className={`rounded-xl border-2 p-4 text-sm font-semibold transition-all duration-200 ${
                    editPrivacy === v 
                      ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20" 
                      : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:bg-accent/20"
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    {v === "public" ? <Globe className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                    {v === "public" ? "Público" : "Privado"}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {editPrivacy === "public" 
                ? "Qualquer pessoa pode descobrir e entrar no seu servidor" 
                : "Apenas convites podem entrar"}
            </p>
          </div>

          <Button onClick={() => updateServer.mutate({ name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy }, {
              onSuccess: () => onServerUpdate({ ...server, name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy }),
            })}
            disabled={updateServer.isPending} className="w-full h-11 text-base font-semibold">
            {updateServer.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground">
            <p className="font-medium mb-1">💡 Dica</p>
            <p className="text-muted-foreground">Um banner atraente e uma descrição clara ajudam novos membros a entender o estilo e propósito da sua comunidade.</p>
          </div>
        </Card>

        {/* Branding e informações rápidas */}
        <div className="space-y-4">

          {canManage && (
            <Card className="p-6 space-y-4 border border-border/80 bg-card/80 backdrop-blur-sm">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">🎨 Branding</h4>
                <p className="text-xs text-muted-foreground">Customize a aparência do seu servidor.</p>
              </div>

              <div className="rounded-lg overflow-hidden border border-border bg-slate-950/5">
                {server.banner_url ? (
                  <img src={server.banner_url} alt="Banner do servidor" className="h-32 w-full object-cover" />
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-primary/10 to-slate-100 grid place-items-center text-sm text-muted-foreground">
                    <div className="text-center">
                      <p className="font-medium">Sem banner</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Adicione uma imagem de 1200×400</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3">
                <Button onClick={() => bannerRef.current?.click()} className="h-10 font-medium">
                  Mudar banner
                </Button>
                {server.banner_url && (
                  <Button variant="outline" className="h-10" onClick={async () => { 
                    await supabase.from('servers').update({ banner_url: null }).eq('id', serverId); 
                    onServerUpdate({ ...server, banner_url: null }); 
                    toast.success('Banner removido'); 
                  }}>
                    Remover banner
                  </Button>
                )}
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                  dragOver ? "border-primary bg-primary/10" : "border-border hover:border-primary/50 bg-background hover:bg-primary/5"
                }`}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm">Clique ou arraste para trocar o ícone</p>
                <p className="text-xs text-muted-foreground mt-1">PNG/JPG/GIF até 10MB</p>
                <input type="file" ref={fileRef} className="hidden" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIcon(f); e.target.value = ""; }} />
              </div>
            </Card>
          )}

          <Card className="p-6 space-y-4 border border-border/80 bg-card/80 backdrop-blur-sm">
            <h4 className="text-sm font-semibold">📊 Informações</h4>
            <div className="grid gap-3">
              <div className="rounded-lg border border-border bg-background/60 p-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Data de criação</p>
                <p className="mt-2 font-semibold text-sm">{new Date(server.created_at).toLocaleDateString("pt-BR", { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Membros ativos</p>
                <p className="mt-2 font-semibold text-sm">{server.member_count} {server.member_count === 1 ? "membro" : "membros"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">ID do servidor</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground/80 break-all">{serverId}</p>
              </div>
            </div>
          </Card>

          {isOwner && (
            <Card className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 space-y-4">
              <h4 className="text-sm font-semibold text-destructive/90">⚠️ Zona de Perigo</h4>
              <p className="text-xs text-muted-foreground">Deletar o servidor remove todos os canais, mensagens e arquivos permanentemente. Esta ação é irreversível!</p>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteServer.isPending} className="w-full h-10 font-semibold">
                {deleteServer.isPending ? "Deletando..." : "Deletar servidor"}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
