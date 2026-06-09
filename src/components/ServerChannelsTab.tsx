import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useServerChannels, useUpdateChannel, useDeleteChannel } from "@/hooks/servers";
import { CategoryGroup } from "@/components/CategoryGroup";
import { ChannelItem } from "@/components/ChannelItem";
import { FolderOpen } from "lucide-react";

export function ServerChannelsTab({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const { data: channels = [], isLoading } = useServerChannels(serverId);
  const updateChannel = useUpdateChannel(serverId);
  const deleteChannel = useDeleteChannel(serverId);

  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMinLevel, setEditMinLevel] = useState(1);
  const [editCategory, setEditCategory] = useState("");

  const grouped = new Map<string, any[]>();
  const uncategorized: any[] = [];
  for (const c of channels) {
    if (c.category) { if (!grouped.has(c.category)) grouped.set(c.category, []); grouped.get(c.category)!.push(c); }
    else { uncategorized.push(c); }
  }

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
  }

  function openEdit(c: any) {
    setEditingChannel(c);
    setEditName(c.name);
    setEditTopic(c.topic ?? "");
    setEditDesc(c.description ?? "");
    setEditMinLevel(c.min_level ?? 1);
    setEditCategory(c.category ?? "");
  }

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>;
  }

  if (!channels.length) {
    return (
      <div className="flex flex-col items-center py-12 text-muted-foreground/60">
        <FolderOpen className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">Nenhum canal criado</p>
        <p className="text-xs text-muted-foreground/50 mt-1">Comece criando canais de texto ou voz</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="h-[420px] -mx-1 px-1">
        <div className="space-y-2 pr-3">
          {Array.from(grouped.entries()).map(([catName, catChannels]) => (
            <CategoryGroup key={catName} name={catName} channels={catChannels} canManage={canManage}
              onEdit={openEdit} onDelete={(c) => { if (confirm("Deletar este canal permanentemente?")) deleteChannel.mutate(c.id); }} />
          ))}
          {uncategorized.length > 0 && (
            <div className="space-y-1.5">
              <div className="px-3 py-2.5 text-xs uppercase tracking-wider text-muted-foreground/50 font-medium">Sem categoria</div>
              <div className="space-y-0.5">
                {uncategorized.map((c) => (
                  <ChannelItem key={c.id} channel={c} canManage={canManage}
                    onEdit={() => openEdit(c)} onDelete={() => { if (confirm("Deletar este canal permanentemente?")) deleteChannel.mutate(c.id); }} />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <ResponsiveDialog open={!!editingChannel} onOpenChange={(v) => { if (!v) setEditingChannel(null); }} title="Editar canal" className="max-w-md">
        {editingChannel && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do canal</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-10 text-sm" maxLength={32} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Tópico</Label>
              <Input value={editTopic} onChange={(e) => setEditTopic(e.target.value)} className="h-10 text-sm" maxLength={128} placeholder="Assunto do canal..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição</Label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="h-10 text-sm" maxLength={300} placeholder="Descrição detalhada..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Categoria</Label>
              <Input value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="h-10 text-sm" placeholder="ex: Geral, Voz, Desenvolvimento..." />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold">Nível mínimo: {editMinLevel}</Label>
                <span className="text-xs text-muted-foreground">Lvl {editMinLevel}+</span>
              </div>
              <input type="range" min={1} max={99} value={editMinLevel} onChange={(e) => setEditMinLevel(Number(e.target.value))} className="w-full accent-primary cursor-pointer" />
            </div>
            <Button onClick={saveChannel} className="w-full h-10 text-sm font-medium">Salvar alterações</Button>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}
