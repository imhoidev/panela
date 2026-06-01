import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Volume2, Hash, Pencil, ScrollText, MessageSquare, MessageSquareText, X } from "lucide-react";
import { toast } from "sonner";

const channelMeta = (type: string) => {
  switch (type) {
    case "voice": return { icon: Volume2, color: "text-emerald-500" };
    case "announcement": return { icon: MessageSquare, color: "text-amber-500" };
    case "rules": return { icon: ScrollText, color: "text-rose-500" };
    case "forum": return { icon: MessageSquareText, color: "text-violet-500" };
    default: return { icon: Hash, color: "text-primary/70" };
  }
};

export function ServerChannelsTab({
  serverId, canManage,
}: {
  serverId: string; canManage: boolean;
}) {
  const [channels, setChannels] = useState<any[]>([]);
  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMinLevel, setEditMinLevel] = useState(1);
  const [editCategory, setEditCategory] = useState("");

  useEffect(() => {
    supabase.from("channels").select("*").eq("server_id", serverId).order("position").then(({ data }) => setChannels(data ?? []));
  }, [serverId]);

  async function saveChannel() {
    if (!editingChannel) return;
    const { error } = await supabase.from("channels").update({
      name: editName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32),
      topic: editTopic.trim() || null,
      description: editDesc.trim() || null,
      min_level: editMinLevel,
      category: editCategory.trim() || null,
    }).eq("id", editingChannel.id);
    if (error) return toast.error(error.message);
    setEditingChannel(null);
    toast.success("Canal atualizado");
    supabase.from("channels").select("*").eq("server_id", serverId).order("position").then(({ data }) => setChannels(data ?? []));
  }

  async function deleteChannel(id: string) {
    if (!confirm("Deletar este canal permanentemente?")) return;
    const { error } = await supabase.from("channels").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Canal deletado");
    setChannels((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-3">
      {channels.length === 0 ? (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Nenhum canal.</p>
      ) : (
        <ScrollArea className="h-[320px] -mx-1 px-1">
          <div className="space-y-0.5">
            {channels.map((c: any) => {
              const { icon: ChanIcon, color: chanColor } = channelMeta(c.type);
              return (
                <div key={c.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-accent/30 transition-colors group">
                  <ChanIcon className={`h-4 w-4 shrink-0 ${chanColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {c.category && <span className="text-[10px] text-muted-foreground/40">{c.category}</span>}
                    </div>
                    {c.topic && <p className="text-[10px] text-muted-foreground/60 truncate">{c.topic}</p>}
                  </div>
                  {canManage && (
                    <button onClick={() => { setEditingChannel(c); setEditName(c.name); setEditTopic(c.topic ?? ""); setEditDesc(c.description ?? ""); setEditMinLevel(c.min_level ?? 1); setEditCategory(c.category ?? ""); }}
                      className="p-1 text-muted-foreground/30 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all">
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                  {canManage && (
                    <button onClick={() => deleteChannel(c.id)}
                      className="p-1 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      <ResponsiveDialog open={!!editingChannel} onOpenChange={(v) => { if (!v) setEditingChannel(null); }} title="Editar canal" className="max-w-md">
        {editingChannel && (
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9 text-sm" maxLength={32} /></div>
            <div className="space-y-1"><Label className="text-xs">Topico</Label><Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} className="h-9 text-sm" maxLength={128} placeholder="Assunto do canal..." /></div>
            <div className="space-y-1"><Label className="text-xs">Descricao</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-9 text-sm" maxLength={300} placeholder="Descricao..." /></div>
            <div className="space-y-1"><Label className="text-xs">Categoria</Label><Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-9 text-sm" placeholder="ex: Geral, Voz..." /></div>
            <div className="space-y-1">
              <Label className="text-xs">Nivel minimo: {editMinLevel}</Label>
              <input type="range" min={1} max={99} value={editMinLevel} onChange={(e) => setEditMinLevel(Number(e.target.value))} className="w-full accent-primary" />
            </div>
            <Button onClick={saveChannel} className="w-full h-9 text-sm">Salvar</Button>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
