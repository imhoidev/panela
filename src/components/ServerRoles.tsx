import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Shield, Plus, Trash2 } from "lucide-react";

type ServerRole = {
  id: string; name: string; level: number; color: string | null;
  permissions: Record<string, boolean>; gif_tag_url: string | null; member_count?: number;
};

const ALL_PERMS = [
  "manage_channels", "manage_roles", "manage_messages", "kick_members", "ban_members",
  "mention_everyone", "attach_files", "create_threads", "voice_mute", "voice_deafen",
];

export function ServerRoles({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [roles, setRoles] = useState<ServerRole[]>([]);

  function load() {
    supabase.from("server_roles").select("*").eq("server_id", serverId).order("level", { ascending: false }).then(({ data }) => {
      setRoles((data ?? []) as ServerRole[]);
    });
  }
  useEffect(() => { load(); }, [serverId]);

  async function create() {
    const { error } = await supabase.from("server_roles").insert({
      server_id: serverId, name: "Novo cargo", level: 1, permissions: {},
    });
    if (error) toast.error(error.message); else load();
  }

  async function save(r: ServerRole) {
    const { error } = await supabase.from("server_roles").update({
      name: r.name, level: r.level, color: r.color || null,
      permissions: r.permissions, gif_tag_url: r.gif_tag_url || null,
    }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir cargo? Membros com este cargo perderão ele.")) return;
    await supabase.from("server_roles").delete().eq("id", id);
    load();
  }

  return (
    <div className="space-y-3">
      {roles.length === 0 && (
        <p className="text-xs text-muted-foreground/60 text-center py-6">Nenhum cargo ainda.</p>
      )}
      <ScrollArea className="max-h-[50dvh] pr-2 -mr-2">
        <div className="space-y-3">
          {roles.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {r.color && (
                    <span className="h-4 w-4 rounded-full shrink-0 ring-1 ring-border/30" style={{ backgroundColor: r.color }} />
                  )}
                  <Input value={r.name} onChange={(e) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))}
                    className="h-8 text-sm font-medium flex-1 min-w-0"
                    onBlur={() => { const u = roles.find((x) => x.id === r.id); if (u) save(u); }} />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => remove(r.id)} disabled={!canManage}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0 w-16">Nível {r.level}</Label>
                <Slider value={[r.level]} onValueChange={([v]) => {
                  setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, level: v } : x));
                }} min={1} max={99} className="flex-1"
                  onValueCommit={([v]) => { const u = roles.find((x) => x.id === r.id); if (u) save({ ...u, level: v }); }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Cor</Label>
                  <div className="flex items-center gap-2">
                    <Input type="color" value={r.color || "#e4d8b4"} onChange={(e) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, color: e.target.value } : x))}
                      className="h-8 w-12 p-0.5 cursor-pointer"
                      onBlur={() => { const u = roles.find((x) => x.id === r.id); if (u) save(u); }} />
                    {r.color && (
                      <button onClick={() => { setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, color: null } : x)); save({ ...r, color: null }); }}
                        className="text-[10px] text-muted-foreground/50 hover:text-foreground">Limpar</button>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Badge GIF (URL)</Label>
                  <Input value={r.gif_tag_url || ""} placeholder="https://..." onChange={(e) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, gif_tag_url: e.target.value } : x))}
                    className="h-8 text-xs font-mono"
                    onBlur={() => { const u = roles.find((x) => x.id === r.id); if (u) save(u); }} />
                </div>
              </div>
              {r.gif_tag_url && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Preview:</span>
                  <img src={r.gif_tag_url} alt="" className="h-5 w-5 rounded object-cover" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                {ALL_PERMS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-xs">
                    <Switch checked={r.permissions?.[perm] || false} disabled={!canManage}
                      onCheckedChange={(v) => {
                        setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, permissions: { ...x.permissions, [perm]: v } } : x));
                      }}
                      onMouseUp={() => { const u = roles.find((x) => x.id === r.id); if (u) save(u); }} />
                    {perm.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {canManage && (
        <Button variant="outline" className="w-full" onClick={create}><Plus className="h-4 w-4 mr-1" />Novo cargo</Button>
      )}
    </div>
  );
}
