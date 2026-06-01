import { useState, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, Lock, AtSign } from "lucide-react";
import { toast } from "sonner";
import { slugify, isValidSlug } from "@/lib/slug";

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
  const [saving, setSaving] = useState(false);
  const [changingSlug, setChangingSlug] = useState(false);
  const [newSlug, setNewSlug] = useState(server.slug ?? "");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase.from("servers").update({
      name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy,
    }).eq("id", serverId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Servidor atualizado!");
    onServerUpdate({ ...server, name: editName.trim(), description: editDesc.trim() || null, privacy: editPrivacy });
  }

  async function saveSlug() {
    const s = newSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32);
    if (!s) return toast.error("Slug invalido");
    setChangingSlug(true);
    const { error } = await supabase.from("servers").update({ slug: s }).eq("id", serverId);
    setChangingSlug(false);
    if (error) {
      if ((error as any).code === "23505") return toast.error("Slug ja em uso.");
      return toast.error(error.message);
    }
    toast.success("Slug atualizado!");
    onServerUpdate({ ...server, slug: s });
  }

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
      toast.success("Icone atualizado!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingIcon(false);
    }
  }

  async function deleteServer() {
    if (!confirm("TEM CERTEZA? Esta acao e irreversivel.")) return;
    if (!confirm("Serio mesmo? Confirme.")) return;
    setDeleting(true);
    const { error } = await supabase.from("servers").delete().eq("id", serverId);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Servidor deletado.");
    router.navigate({ to: "/app/servers" });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-xl border border-border p-4 space-y-3 bg-accent/15">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editar servidor</h4>

          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-16 w-16 rounded-2xl overflow-hidden ring-2 ring-border/40 bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center">
                {iconPreview ? (
                  <img src={iconPreview} className="h-full w-full object-cover" alt="" />
                ) : server.icon_url ? (
                  <img src={server.icon_url} className="h-full w-full object-cover" alt="" />
                ) : (
                  <span className="text-lg font-bold text-primary/60">{server.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <input type="file" ref={fileRef} className="hidden" accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setIconPreview(URL.createObjectURL(f)); uploadIcon(f); }
                  e.target.value = "";
                }} />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingIcon}
                className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[10px] border-2 border-background hover:scale-110 transition-transform disabled:opacity-50"
                title="Trocar icone">
                {uploadingIcon ? "..." : "✎"}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/60">Clique no icone para alterar a foto do servidor.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={48} className="h-10 text-sm" placeholder="Nome do servidor" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descricao</Label>
            <Textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} maxLength={300} rows={3} className="text-sm resize-none" placeholder="Descricao do servidor..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Visibilidade</Label>
            <div className="flex gap-2">
              {["public", "private"].map((v) => (
                <button key={v} type="button" onClick={() => setEditPrivacy(v)}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg border h-10 text-xs transition-all ${
                    editPrivacy === v ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:border-muted-foreground/30"
                  }`}>
                  {v === "public" ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                  {v === "public" ? "Publico" : "Privado"}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving} className="w-full h-10 text-sm">{saving ? "Salvando..." : "Salvar alteracoes"}</Button>
        </div>
      )}

      {isOwner && (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug (URL publica)</h4>
          <p className="text-xs text-muted-foreground/60">panela.app/s/<span className="font-mono text-foreground/80">{newSlug || "..."}</span></p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <AtSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={newSlug} onChange={(e) => setNewSlug(slugify(e.target.value))}
                maxLength={32} placeholder="meu-servidor" className="h-9 text-sm font-mono pl-8 flex-1" />
            </div>
            <Button onClick={saveSlug} disabled={changingSlug || !newSlug.trim() || newSlug === server.slug} size="sm" className="h-9">
              {changingSlug ? "..." : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border p-4 space-y-2.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informacoes</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div><span className="text-muted-foreground/60">Criado em</span><p className="mt-0.5 text-muted-foreground/80">{new Date(server.created_at).toLocaleDateString("pt-BR")}</p></div>
          <div><span className="text-muted-foreground/60">Membros</span><p className="mt-0.5 text-muted-foreground/80">{server.member_count}</p></div>
          <div className="col-span-2"><span className="text-muted-foreground/60">ID</span><p className="font-mono text-[10px] truncate mt-0.5 text-muted-foreground/60">{serverId}</p></div>
        </div>
      </div>

      {isOwner && (
        <div className="rounded-xl border border-destructive/20 p-4 space-y-2.5 bg-destructive/5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-destructive/80">Zona de Perigo</h4>
          <p className="text-xs text-muted-foreground">Deletar o servidor remove todos os canais, mensagens e arquivos permanentemente.</p>
          <Button variant="destructive" onClick={deleteServer} disabled={deleting} className="h-9 text-xs">
            {deleting ? "Deletando..." : "Deletar servidor"}
          </Button>
        </div>
      )}
    </div>
  );
}
