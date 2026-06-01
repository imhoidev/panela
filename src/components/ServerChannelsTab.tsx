import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useServerChannels, useUpdateChannel, useDeleteChannel } from "@/hooks/servers";
import {
  Volume2, Hash, Pencil, ScrollText, MessageSquare, MessageSquareText, X,
} from "lucide-react";
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

export function ServerChannelsTab({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const { data: channels, isLoading } = useServerChannels(serverId);
  const updateChannel = useUpdateChannel(serverId);
  const deleteChannel = useDeleteChannel(serverId);

  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMinLevel, setEditMinLevel] = useState(1);
  const [editCategory, setEditCategory] = useState("");

  async function saveChannel() {
    if (!editingChannel) return;
    updateChannel.mutate({
      id: editingChannel.id,
      name: editName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 32),
      topic: editTopic.trim() || null,
      description: editDesc.trim() || null,
      min_level: editMinLevel,
      category: editCategory.trim() || null,
    });
    setEditingChannel(null);
    toast.success("Canal atualizado");
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!channels?.length ? (
        <div className="flex flex-col items-center py-10 text-muted-foreground/60">
          <Hash className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs font-medium">Nenhum canal</p>
        </div>
      ) : (
        <ScrollArea className="h-[320px] -mx-1 px-1">
          <div className="space-y-1">
            {channels.map((c: any) => {
              const { icon: ChanIcon, color: chanColor } = channelMeta(c.type);
              return (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/30 transition-colors group">
                  <div className={`h-8 w-8 rounded-lg grid place-items-center ${chanColor.replace("text-", "bg-").replace("500", "500/15")}`}>
                    <ChanIcon className={`h-4 w-4 ${chanColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{c.name}</span>
                      {c.category && <span className="text-[10px] text-muted-foreground/40 border border-border/40 px-1.5 py-0.5 rounded">{c.category}</span>}
                    </div>
                    {c.topic && <p className="text-[10px] text-muted-foreground/60 truncate">{c.topic}</p>}
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => { setEditingChannel(c); setEditName(c.name); setEditTopic(c.topic ?? ""); setEditDesc(c.description ?? ""); setEditMinLevel(c.min_level ?? 1); setEditCategory(c.category ?? ""); }}
                        className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-colors" title="Editar">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => { if (confirm("Deletar este canal permanentemente?")) deleteChannel.mutate(c.id); }}
                        className="p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Deletar">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
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
