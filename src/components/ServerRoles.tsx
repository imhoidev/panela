import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Shield, Plus, Trash2 } from "lucide-react";

type ServerRole = {
  id: string; name: string; level: number; color: string | null;
  permissions: Record<string, boolean>; member_count?: number;
};

const ALL_PERMS = [
  "manage_channels", "manage_roles", "manage_messages", "kick_members", "ban_members",
  "mention_everyone", "attach_files", "create_threads", "voice_mute", "voice_deafen",
];

export function ServerRolesDialog({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [editing, setEditing] = useState<ServerRole | null>(null);
  const [open, setOpen] = useState(false);

  function load() {
    supabase.from("server_roles").select("*").eq("server_id", serverId).order("level", { ascending: false }).then(({ data }) => {
      setRoles((data ?? []) as ServerRole[]);
    });
  }
  useEffect(() => { if (open) load(); }, [open, serverId]);

  async function create() {
    const { error } = await supabase.from("server_roles").insert({
      server_id: serverId, name: "Novo cargo", level: 1, permissions: {},
    });
    if (error) toast.error(error.message); else load();
  }

  async function save() {
    if (!editing) return;
    const { error } = await supabase.from("server_roles").update({
      name: editing.name, level: editing.level, color: editing.color || null,
      permissions: editing.permissions,
    }).eq("id", editing.id);
    if (error) toast.error(error.message); else { toast.success("Cargo salvo"); load(); }
  }

  async function remove(id: string) {
    if (!confirm("Excluir cargo?")) return;
    await supabase.from("server_roles").delete().eq("id", id);
    load();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!canManage}><Shield className="h-4 w-4 mr-1" />Cargos</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Cargos do servidor</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {roles.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Input value={r.name} onChange={(e) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, name: e.target.value } : x))}
                  className="h-8 text-sm flex-1 font-medium" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Nível {r.level}</Label>
                <Slider value={[r.level]} onValueChange={([v]) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, level: v } : x))}
                  min={1} max={99} className="flex-1" />
              </div>
              <div>
                <Label className="text-xs">Cor</Label>
                <Input type="color" value={r.color || "#e4d8b4"} onChange={(e) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, color: e.target.value } : x))}
                  className="h-8 w-16 p-1" />
              </div>
              <div className="grid grid-cols-2 gap-1">
                {ALL_PERMS.map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-xs">
                    <Switch checked={r.permissions?.[perm] || false}
                      onCheckedChange={(v) => setRoles((prev) => prev.map((x) => x.id === r.id ? { ...x, permissions: { ...x.permissions, [perm]: v } } : x))} />
                    {perm.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={create}><Plus className="h-4 w-4 mr-1" />Novo cargo</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
