import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useServerChannels, useUpdateChannel, useDeleteChannel } from "@/hooks/servers";
import {
  Volume2, Hash, Pencil, ScrollText, MessageSquare, MessageSquareText, X, ChevronDown,
  ChevronRight, FolderOpen, Plus, GripVertical, Folder,
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
  const { data: channels = [], isLoading } = useServerChannels(serverId);
  const updateChannel = useUpdateChannel(serverId);
  const deleteChannel = useDeleteChannel(serverId);

  const [editingChannel, setEditingChannel] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editMinLevel, setEditMinLevel] = useState(1);
  const [editCategory, setEditCategory] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<any | null>(null);
  const [creatingCat, setCreatingCat] = useState(false);

  // Agrupar canais por categoria
  const grouped = new Map<string, any[]>();
  const uncategorized: any[] = [];
  
  channels.forEach((c: any) => {
    if (c.category) {
      if (!grouped.has(c.category)) grouped.set(c.category, []);
      grouped.get(c.category)!.push(c);
    } else {
      uncategorized.push(c);
    }
  });

  const toggleCat = (cat: string) => {
    const newSet = new Set(collapsedCats);
    if (newSet.has(cat)) newSet.delete(cat);
    else newSet.add(cat);
    setCollapsedCats(newSet);
  };

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
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!channels.length ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground/60">
          <FolderOpen className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">Nenhum canal criado</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Comece criando canais de texto ou voz</p>
        </div>
      ) : (
        <ScrollArea className="h-[420px] -mx-1 px-1">
          <div className="space-y-2 pr-3">
            {/* Categorias com canais */}
            {Array.from(grouped.entries()).map(([catName, catChannels]) => {
              const isCollapsed = collapsedCats.has(catName);
              return (
                <div key={catName} className="space-y-1.5">
                  <button
                    onClick={() => toggleCat(catName)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-accent/20 transition-all text-sm font-medium text-foreground/70 group"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <Folder className="h-3.5 w-3.5 text-primary/60" />
                    <span className="flex-1 text-left">{catName}</span>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                      {catChannels.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5 pl-4 border-l border-border/40">
                      {catChannels.map((c: any) => (
                        <ChannelItem
                          key={c.id}
                          channel={c}
                          canManage={canManage}
                          onEdit={() => {
                            setEditingChannel(c);
                            setEditName(c.name);
                            setEditTopic(c.topic ?? "");
                            setEditDesc(c.description ?? "");
                            setEditMinLevel(c.min_level ?? 1);
                            setEditCategory(c.category ?? "");
                          }}
                          onDelete={() => {
                            if (confirm("Deletar este canal permanentemente?")) {
                              deleteChannel.mutate(c.id);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Canais sem categoria */}
            {uncategorized.length > 0 && (
              <div className="space-y-1.5">
                <div className="px-3 py-2.5 text-sm font-medium text-muted-foreground/50 text-xs uppercase tracking-wider">
                  Sem categoria
                </div>
                <div className="space-y-0.5">
                  {uncategorized.map((c: any) => (
                    <ChannelItem
                      key={c.id}
                      channel={c}
                      canManage={canManage}
                      onEdit={() => {
                        setEditingChannel(c);
                        setEditName(c.name);
                        setEditTopic(c.topic ?? "");
                        setEditDesc(c.description ?? "");
                        setEditMinLevel(c.min_level ?? 1);
                        setEditCategory(c.category ?? "");
                      }}
                      onDelete={() => {
                        if (confirm("Deletar este canal permanentemente?")) {
                          deleteChannel.mutate(c.id);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Editar canal */}
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
            <Button onClick={saveChannel} className="w-full h-10 text-sm font-medium">
              Salvar alterações
            </Button>
          </div>
        )}
      </ResponsiveDialog>
    </div>
  );
}

function ChannelItem({ channel, canManage, onEdit, onDelete }: any) {
  const { icon: ChanIcon, color: chanColor } = channelMeta(channel.type);
  
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-all group">
      {canManage && <GripVertical className="h-3.5 w-3.5 text-muted-foreground/20 cursor-grab active:cursor-grabbing" />}
      <div className={`h-7 w-7 rounded-md grid place-items-center ${chanColor.replace("text-", "bg-").replace("500", "500/15")}`}>
        <ChanIcon className={`h-3.5 w-3.5 ${chanColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">{channel.name}</p>
        {channel.topic && <p className="text-[11px] text-muted-foreground/60 truncate">{channel.topic}</p>}
      </div>
      {canManage && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={onEdit}
            className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all"
            title="Editar canal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
            title="Deletar canal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
