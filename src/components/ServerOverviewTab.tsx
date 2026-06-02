import { useState, useRef, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="relative h-44 sm:h-52 bg-slate-950/10">
          {server.banner_url ? (
            <img src={server.banner_url} alt="banner" className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-emerald-10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-5 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative h-20 w-20 rounded-3xl overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center text-3xl font-semibold text-white/90">
                {server.icon_url ? (
                  <img src={server.icon_url} alt="Ícone do servidor" className="h-full w-full object-cover" />
                ) : (
                  <span>{server.name[0]?.toUpperCase()}</span>
                )}
              </div>

              <div className="min-w-0 text-white">
                <h2 className="text-xl sm:text-2xl font-semibold leading-tight">{server.name}</h2>
                <p className="mt-1 text-sm text-white/70 line-clamp-2">
                  {server.description || "Dê vida ao seu servidor com banner, descrição e configurações mais claras."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-white/20 text-white/80 bg-black/20">
                    {server.privacy === "private" ? "Privado" : "Público"}
                  </Badge>
                  <Badge variant="outline" className="border-white/20 text-white/80 bg-black/20">
                    {server.member_count} {server.member_count === 1 ? "membro" : "membros"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.75fr_1fr]">
        <Card className="p-5 space-y-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Informações principais</p>
            <p className="text-sm text-muted-foreground">Atualize nome, descrição e visibilidade do servidor com feedback em tempo real.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do servidor</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} className="h-10 text-sm" placeholder="Nome do servidor" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Slug público</Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl border border-border bg-background/80 px-3 py-2 text-xs text-muted-foreground font-mono truncate">panela.app/s/{server.slug || "seu-slug"}</div>
                <Button onClick={() => updateServer.mutate({ slug: slugify(newSlug) }, {
                    onSuccess: () => onServerUpdate({ ...server, slug: slugify(newSlug) }),
                  })}
                  disabled={updateServer.isPending || !newSlug.trim() || slugify(newSlug) === server.slug} size="sm" className="h-10">
                  Salvar
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={4} className="text-sm resize-none" placeholder="Descrição do servidor..." />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Visibilidade</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["public", "private"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setEditPrivacy(v)}
                  className={`rounded-2xl border p-3 text-xs font-medium transition ${
                    editPrivacy === v ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"
                  }`}>
                  <div className="flex items-center justify-center gap-2">
                    {v === "public" ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    {v === "public" ? "Público" : "Privado"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={() => updateServer.mutate({ name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy }, {
              onSuccess: () => onServerUpdate({ ...server, name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy }),
            })}
            disabled={updateServer.isPending} className="w-full h-11 text-sm">
            {updateServer.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <div className="rounded-3xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
            Dica: um banner e uma descrição clara ajudam novos membros a entender o estilo da sua comunidade.
          </div>
        </Card>

        <div className="space-y-4">
          {canManage && (
            <Card className="p-5 space-y-4">
              <div className="space-y-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branding do servidor</h4>
                <p className="text-sm text-muted-foreground">Troque banner ou ícone para deixar a comunidade mais atraente.</p>
              </div>

              <div className="rounded-3xl overflow-hidden border border-border bg-slate-950/5">
                {server.banner_url ? (
                  <img src={server.banner_url} alt="Banner do servidor" className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-gradient-to-br from-primary/10 to-slate-100 grid place-items-center text-sm text-muted-foreground">Sem banner</div>
                )}
              </div>

              <div className="grid gap-3">
                <Button onClick={() => bannerRef.current?.click()} className="h-10">Mudar banner</Button>
                {server.banner_url && (
                  <Button variant="outline" className="h-10" onClick={async () => { await supabase.from('servers').update({ banner_url: null }).eq('id', serverId); onServerUpdate({ ...server, banner_url: null }); toast.success('Banner removido'); }}>
                    Remover banner
                  </Button>
                )}
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative rounded-3xl border border-border p-4 text-center text-sm transition ${dragOver ? "border-primary bg-primary/10" : "bg-background"}`}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="font-medium">Clique ou arraste para trocar o ícone</p>
                <p className="text-xs text-muted-foreground">PNG/JPG/GIF até 10MB</p>
                <input type="file" ref={fileRef} className="hidden" accept="image/*"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIcon(f); e.target.value = ""; }} />
              </div>
            </Card>
          )}

          <Card className="p-5 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados rápidos</h4>
            <div className="grid gap-3 text-sm">
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-muted-foreground text-xs">Criado em</p>
                <p className="mt-1 font-medium">{new Date(server.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-muted-foreground text-xs">Membros</p>
                <p className="mt-1 font-medium">{server.member_count}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <p className="text-muted-foreground text-xs">ID do servidor</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground/80 truncate">{serverId}</p>
              </div>
            </div>
          </Card>

          {isOwner && (
            <Card className="rounded-3xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive/80">Zona de Perigo</h4>
              <p className="text-sm text-muted-foreground">Deletar o servidor remove todos os canais, mensagens e arquivos permanentemente.</p>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteServer.isPending} className="h-10 text-sm">
                {deleteServer.isPending ? "Deletando..." : "Deletar servidor"}
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
