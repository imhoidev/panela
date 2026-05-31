import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Sticker, Plus, Trash2, Upload, X } from "lucide-react";

type Pack = { id: string; name: string; server_id: string | null; owner_id: string | null; is_pro_only: boolean; stickers?: { id: string; name: string; url: string }[] };

export function ServerStickers({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [newPackName, setNewPackName] = useState("");
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function load() {
    supabase.from("sticker_packs").select("*, stickers(*)").eq("server_id", serverId).order("created_at").then(({ data }) => {
      setPacks((data ?? []) as Pack[]);
    });
  }
  useEffect(() => { load(); }, [serverId]);

  async function createPack() {
    const name = newPackName.trim();
    if (!name) return toast.error("Nome do pack é obrigatório");
    const { error } = await supabase.from("sticker_packs").insert({
      server_id: serverId, name, owner_id: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) return toast.error(error.message);
    setNewPackName(""); load();
  }

  async function deletePack(id: string) {
    if (!confirm("Excluir pack e todas as figurinhas?")) return;
    await supabase.from("sticker_packs").delete().eq("id", id);
    load();
  }

  async function uploadSticker(packId: string, file: File) {
    setUploading((prev) => ({ ...prev, [packId]: true }));
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sticker_pack_id", packId);
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/upload-sticker`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sess.session?.access_token}` },
        body: formData,
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Upload falhou"); }
      const { url } = await res.json();
      await supabase.from("stickers").insert({
        pack_id: packId, name: file.name.replace(/\.[^.]+$/, "").slice(0, 32), url,
      });
      toast.success("Figurinha adicionada!");
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading((prev) => ({ ...prev, [packId]: false }));
    }
  }

  async function deleteSticker(stickerId: string) {
    await supabase.from("stickers").delete().eq("id", stickerId);
    load();
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex gap-2">
          <Input value={newPackName} onChange={(e) => setNewPackName(e.target.value)}
            placeholder="Nome do novo pack..." className="h-9 text-sm flex-1"
            onKeyDown={(e) => { if (e.key === "Enter") createPack(); }} />
          <Button onClick={createPack} size="sm" className="shrink-0"><Plus className="h-4 w-4 mr-1" />Criar</Button>
        </div>
      )}

      {packs.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Nenhum pack de figurinhas ainda.</p>
      )}

      <ScrollArea className="max-h-[50dvh] pr-2 -mr-2">
        <div className="space-y-4">
          {packs.map((pack) => (
            <div key={pack.id} className="rounded-lg border border-border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Sticker className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{pack.name}</span>
                  <span className="text-[10px] text-muted-foreground/50">({(pack.stickers?.length ?? 0)} stickers)</span>
                </div>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deletePack(pack.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {pack.stickers?.map((s) => (
                  <div key={s.id} className="group relative aspect-square rounded-lg overflow-hidden bg-accent/30">
                    <img src={s.url} alt={s.name} className="w-full h-full object-contain p-1" title={s.name} />
                    {canManage && (
                      <button onClick={() => deleteSticker(s.id)}
                        className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-background/80 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
                        title="Remover">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}

                {canManage && (
                  <div className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 transition-colors flex items-center justify-center cursor-pointer relative"
                    onClick={() => fileRefs.current[pack.id]?.click()}>
                    {uploading[pack.id] ? (
                      <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground/40" />
                    )}
                    <input ref={(el) => { fileRefs.current[pack.id] = el; }} type="file" className="hidden" accept="image/*"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadSticker(pack.id, f); e.target.value = ""; }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
