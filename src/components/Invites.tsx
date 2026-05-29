import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link2, Copy, RefreshCw, Trash2 } from "lucide-react";

type Invite = { id: string; code: string; max_uses: number | null; expires_at: string | null; use_count: number };

export function InvitesDialog({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [open, setOpen] = useState(false);
  const [maxUses, setMaxUses] = useState("");
  const [expiresH, setExpiresH] = useState("");

  function load() {
    supabase.from("invites").select("*").eq("server_id", serverId).then(({ data }) => setInvites((data ?? []) as Invite[]));
  }

  async function create() {
    const code = crypto.randomUUID().slice(0, 8);
    const expires = expiresH ? new Date(Date.now() + Number(expiresH) * 3600000).toISOString() : null;
    const { error } = await supabase.from("invites").insert({
      server_id: serverId, code, created_by: (await supabase.auth.getSession()).data.session?.user.id,
      max_uses: maxUses ? Number(maxUses) : null, expires_at: expires,
    });
    if (error) toast.error(error.message); else { load(); setMaxUses(""); setExpiresH(""); }
  }

  async function removeInvite(id: string) {
    await supabase.from("invites").delete().eq("id", id);
    load();
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}
      title="Convites"
      trigger={<Button variant="ghost" size="sm" disabled={!canManage}><Link2 className="h-4 w-4 mr-1" />Convites</Button>}>
      <div className="space-y-3">
        {canManage && (
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Max usos</Label>
              <Input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} placeholder="Ilimitado" className="h-9" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Expirar em (horas)</Label>
              <Input value={expiresH} onChange={(e) => setExpiresH(e.target.value)} placeholder="Nunca" className="h-9" />
            </div>
            <Button size="sm" onClick={create} className="sm:h-9"><RefreshCw className="h-3 w-3 mr-1" />Criar</Button>
          </div>
        )}
        {invites.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div className="min-w-0 flex-1 mr-2">
              <code className="text-sm font-mono break-all">{inv.code}</code>
              <p className="text-[10px] text-muted-foreground">{inv.use_count}/{inv.max_uses || "∞"} usos{inv.expires_at ? ` · Expira ${new Date(inv.expires_at).toLocaleDateString("pt-BR")}` : ""}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(`${origin}/invite/${inv.code}`); toast.success("Link copiado!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeInvite(inv.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {!invites.length && <p className="text-xs text-muted-foreground text-center py-4">Nenhum convite criado</p>}
      </div>
    </ResponsiveDialog>
  );
}
