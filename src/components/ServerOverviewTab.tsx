import { useState, useRef, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  async function handleDelete() {
    if (!confirm("TEM CERTEZA? Esta ação é irreversível.")) return;
    if (!confirm("Sério mesmo? Confirme.")) return;
    deleteServer.mutate(undefined, {
      onSuccess: () => router.navigate({ to: "/app/servers" }),
    });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-xl border border-border p-5 space-y-4 bg-accent/10">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar servidor</h4>

          <div className="flex items-center gap-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative shrink-0 cursor-pointer group ${
                dragOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
              }`}>
              <div className={`h-16 w-16 rounded-2xl overflow-hidden ring-2 transition-all ${dragOver ? "ring-primary scale-110" : "ring-border/40"} bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center`}>
                {server.icon_url ? (
                  <img src={server.icon_url} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300" alt="" />
                ) : (
                  <span className="text-lg font-bold text-primary/60">{server.name[0]?.toUpperCase()}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center rounded-2xl">
                  <Upload className="h-5 w-5 text-white" />
                </div>
              </div>
              <input type="file" ref={fileRef} className="hidden" accept="image/*"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadIcon(f); e.target.value = ""; }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{server.name}</p>
              <p className="text-xs text-muted-foreground/60">Arraste uma imagem ou clique para trocar o ícone</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} className="h-10 text-sm" placeholder="Nome do servidor" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={3} className="text-sm resize-none" placeholder="Descrição do servidor..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Visibilidade</Label>
            <div className="flex gap-2">
              {(["public", "private"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setEditPrivacy(v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border h-10 text-xs transition-all ${
                    editPrivacy === v ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                  }`}>
                  {v === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {v === "public" ? "Público" : "Privado"}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={() => updateServer.mutate({ name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy })}
            disabled={updateServer.isPending} className="w-full h-10 text-sm">
            {updateServer.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      )}

      {isOwner && (
        <div className="rounded-xl border border-border p-5 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug (URL pública)</h4>
          <p className="text-xs text-muted-foreground/60">panela.app/s/<span className="font-mono text-foreground/80">{newSlug || "..."}</span></p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={newSlug} onChange={(e) => setNewSlug(slugify(e.target.value))}
                maxLength={32} placeholder="meu-servidor" className="h-9 text-sm font-mono pl-8" />
            </div>
            <Button onClick={() => updateServer.mutate({ slug: slugify(newSlug) })}
              disabled={updateServer.isPending || !newSlug.trim() || slugify(newSlug) === server.slug} size="sm" className="h-9">
              Salvar
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-5 space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div><span className="text-muted-foreground/60">Criado em</span><p className="mt-0.5 text-muted-foreground/80">{new Date(server.created_at).toLocaleDateString("pt-BR")}</p></div>
          <div><span className="text-muted-foreground/60">Membros</span><p className="mt-0.5 text-muted-foreground/80">{server.member_count}</p></div>
          <div className="col-span-2"><span className="text-muted-foreground/60">ID</span><p className="font-mono text-[10px] truncate mt-0.5 text-muted-foreground/60">{serverId}</p></div>
        </div>
      </div>

      {isOwner && (
        <div className="rounded-xl border border-destructive/20 p-5 space-y-2.5 bg-destructive/5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive/80">Zona de Perigo</h4>
          <p className="text-xs text-muted-foreground">Deletar o servidor remove todos os canais, mensagens e arquivos permanentemente.</p>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteServer.isPending} className="h-9 text-xs">
            {deleteServer.isPending ? "Deletando..." : "Deletar servidor"}
          </Button>
        </div>
      )}
    </div>
  );
}
