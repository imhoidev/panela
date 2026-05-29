import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Gavel, AlertTriangle } from "lucide-react";

export function ReportDialog({ messageId, channelId }: { messageId: string; channelId?: string }) {
  const [reason, setReason] = useState("spam");
  const [open, setOpen] = useState(false);

  async function report() {
    const { error } = await supabase.from("moderation_reports").insert({
      message_id: messageId, channel_id: channelId, reason, reported_by: (await supabase.auth.getSession()).data.session?.user.id,
    });
    if (error) toast.error(error.message); else { toast.success("Reportado à moderação"); setOpen(false); }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}
      title="Reportar mensagem"
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive">
          <AlertTriangle className="h-4 w-4" />
        </Button>
      }>
      <div className="space-y-3">
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="spam">Spam</SelectItem>
            <SelectItem value="harassment">Assédio</SelectItem>
            <SelectItem value="hate">Discurso de ódio</SelectItem>
            <SelectItem value="nsfw">Conteúdo impróprio</SelectItem>
            <SelectItem value="other">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={report} className="w-full h-10">Enviar report</Button>
      </div>
    </ResponsiveDialog>
  );
}

export function BanDialog({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [durationH, setDurationH] = useState("");
  const [open, setOpen] = useState(false);

  async function ban() {
    if (!userId.trim()) return;
    const expiresAt = durationH ? new Date(Date.now() + Number(durationH) * 3600000).toISOString() : null;
    const { error } = await supabase.from("server_bans").insert({
      server_id: serverId, user_id: userId.trim(), reason: reason || null, banned_by: (await supabase.auth.getSession()).data.session?.user.id, expires_at: expiresAt,
    });
    if (error) toast.error(error.message); else { toast.success("Usuário banido"); setUserId(""); setReason(""); setOpen(false); }
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}
      title="Banir membro"
      trigger={<Button variant="ghost" size="sm" disabled={!canManage} className="text-destructive"><Gavel className="h-4 w-4 mr-1" />Banir</Button>}>
      <div className="space-y-3">
        <div className="space-y-1"><Label>User ID</Label><Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ID do usuário" className="h-10" /></div>
        <div className="space-y-1"><Label>Motivo</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Opcional" className="h-10" /></div>
        <div className="space-y-1"><Label>Duração (horas)</Label><Input value={durationH} onChange={(e) => setDurationH(e.target.value)} placeholder="Permanente se vazio" className="h-10" /></div>
        <Button variant="destructive" onClick={ban} className="w-full h-10">Banir</Button>
      </div>
    </ResponsiveDialog>
  );
}
