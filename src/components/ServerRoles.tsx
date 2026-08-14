import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Shield, Plus, Trash2 } from "lucide-react";
import { useServerRoles } from "@/hooks/servers";
import { useQueryClient } from "@tanstack/react-query";

type ServerRole = {
  id: string; name: string; level: number; color: string | null;
  permissions: Record<string, boolean>; gif_tag_url: string | null; member_count?: number;
};

const PERM_CATEGORIES = [
  {
    label: "Administração & Estrutura",
    perms: [
      { key: "ADMINISTRATE", label: "Administrar comunidade" },
      { key: "MANAGE_CHANNELS", label: "Gerenciar canais" },
      { key: "MANAGE_CATEGORIES", label: "Gerenciar categorias" },
      { key: "MANAGE_ROLES", label: "Gerenciar cargos" },
      { key: "CREATE_INVITES", label: "Criar convites" },
    ],
  },
  {
    label: "Moderação & Membros",
    perms: [
      { key: "MANAGE_MEMBERS", label: "Gerenciar membros" },
      { key: "KICK_MEMBERS", label: "Expulsar membros" },
      { key: "BAN_MEMBERS", label: "Banir membros" },
      { key: "MUTE_MEMBERS", label: "Silenciar membros" },
    ],
  },
  {
    label: "Mensagens & Chat",
    perms: [
      { key: "SEND_MESSAGES", label: "Enviar mensagens" },
      { key: "MANAGE_MESSAGES", label: "Gerenciar mensagens" },
      { key: "MENTION_EVERYONE", label: "Mencionar todos (@everyone)" },
      { key: "ATTACH_FILES", label: "Anexar arquivos" },
    ],
  },
  {
    label: "Voz, Vídeo & Tela",
    perms: [
      { key: "USE_VOICE", label: "Usar canal de voz" },
      { key: "USE_CAMERA", label: "Usar câmera" },
      { key: "SHARE_SCREEN", label: "Compartilhar tela" },
    ],
  },
];

export function ServerRoles({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const { data: roles = [], isLoading } = useServerRoles(serverId);
  const qc = useQueryClient();
  const [localRoles, setLocalRoles] = useState<ServerRole[] | null>(null);

  const displayRoles = localRoles ?? roles;

  function refetch() {
    qc.invalidateQueries({ queryKey: ["roles", serverId] });
    setLocalRoles(null);
  }

  async function create() {
    const { error } = await supabase.from("server_roles").insert({
      server_id: serverId, name: "Novo cargo", level: 1, permissions: {},
    });
    if (error) toast.error(error.message); else refetch();
  }

  async function save(r: ServerRole) {
    const { error } = await supabase.from("server_roles").update({
      name: r.name, level: r.level, color: r.color || null,
      permissions: r.permissions, gif_tag_url: r.gif_tag_url || null,
    }).eq("id", r.id);
    if (error) toast.error(error.message); else refetch();
  }

  async function remove(id: string) {
    if (!confirm("Excluir cargo? Membros com este cargo perderão ele.")) return;
    await supabase.from("server_roles").delete().eq("id", id);
    refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayRoles.length === 0 && (
        <div className="flex flex-col items-center py-8 text-muted-foreground/60">
          <Shield className="h-8 w-8 mb-2 opacity-30" />
          <p className="text-xs font-medium">Nenhum cargo ainda.</p>
        </div>
      )}
      <ScrollArea className="max-h-[50dvh] pr-2 -mr-2">
        <div className="space-y-3">
          {displayRoles.map((r) => {
            const local = localRoles?.find((x) => x.id === r.id) ?? r;
            return (
              <div key={r.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {r.color && (
                      <span className="h-4 w-4 rounded-full shrink-0 ring-1 ring-border/30" style={{ backgroundColor: r.color }} />
                    )}
                    <Input value={local.name} onChange={(e) => setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))}
                      className="h-8 text-sm font-medium flex-1 min-w-0"
                      onBlur={() => { save({ ...local, name: local.name.trim() || "Sem nome" }); }} />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => remove(r.id)} disabled={!canManage}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0 w-16">Nível {local.level}</Label>
                  <Slider value={[local.level]} onValueChange={([v]) => {
                    setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, level: v } : x));
                  }} min={1} max={99} className="flex-1"
                    onValueCommit={([v]) => save({ ...local, level: v })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cor</Label>
                    <div className="flex items-center gap-2">
                      <Input type="color" value={local.color || "#e4d8b4"}
                        onChange={(e) => setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, color: e.target.value } : x))}
                        className="h-8 w-12 p-0.5 cursor-pointer"
                        onBlur={() => save({ ...local, color: local.color })} />
                      {local.color && (
                        <button onClick={() => { setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, color: null } : x)); save({ ...local, color: null }); }}
                          className="text-[10px] text-muted-foreground/50 hover:text-foreground">Limpar</button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Badge GIF (URL)</Label>
                    <Input value={local.gif_tag_url || ""} placeholder="https://..."
                      onChange={(e) => setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, gif_tag_url: e.target.value } : x))}
                      className="h-8 text-xs font-mono"
                      onBlur={() => save({ ...local, gif_tag_url: local.gif_tag_url })} />
                  </div>
                </div>

                {local.gif_tag_url && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Preview:</span>
                    <img src={local.gif_tag_url} alt="" className="h-5 w-5 rounded object-cover" />
                  </div>
                )}

                <div className="space-y-2">
                  {PERM_CATEGORIES.map((cat) => (
                    <div key={cat.label}>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold mb-1.5">{cat.label}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                        {cat.perms.map((perm) => (
                          <label key={perm.key} className="flex items-center gap-2 text-xs py-0.5">
                            <Switch checked={local.permissions?.[perm.key] || false} disabled={!canManage}
                              onCheckedChange={(v) => {
                                const newPerms = { ...(local.permissions || {}), [perm.key]: v };
                                setLocalRoles((prev) => (prev ?? roles).map((x) => x.id === r.id ? { ...x, permissions: newPerms } : x));
                                save({ ...local, permissions: newPerms });
                              }} />
                            <span className="cursor-pointer">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {canManage && (
        <Button variant="outline" className="w-full" onClick={create}><Plus className="h-4 w-4 mr-1" />Novo cargo</Button>
      )}
    </div>
  );
}
