import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarDays, Plus, Trash2, Calendar } from "lucide-react";

type Event = {
  id: string; title: string; description: string | null; event_date: string;
  created_by: string; rsvp_count?: number;
};

export function ServerEventsDialog({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState("");

  function load() {
    supabase.from("server_events").select("*").eq("server_id", serverId).order("event_date", { ascending: true }).then(({ data }) => {
      setEvents((data ?? []) as Event[]);
    });
  }
  useEffect(() => { if (open) load(); }, [open, serverId]);

  async function create() {
    if (!newTitle.trim() || !newDate) return;
    const { error } = await supabase.from("server_events").insert({
      server_id: serverId, title: newTitle.trim(), description: newDesc.trim() || null, event_date: newDate,
    });
    if (error) return toast.error(error.message);
    setNewTitle(""); setNewDesc(""); setNewDate("");
    toast.success("Evento criado!"); load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir evento?")) return;
    await supabase.from("server_events").delete().eq("id", id);
    load();
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}
      title="Eventos"
      trigger={<Button variant="ghost" size="sm"><CalendarDays className="h-4 w-4 mr-1" />Eventos</Button>}>
      <div className="space-y-3">
        {canManage && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título do evento" className="h-9" />
            <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição (opcional)" rows={2} />
            <Label>Data</Label>
            <Input type="datetime-local" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9" />
            <Button size="sm" onClick={create} className="w-full"><Plus className="h-4 w-4 mr-1" />Criar evento</Button>
          </div>
        )}
        {events.map((ev) => (
          <div key={ev.id} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm">{ev.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" /> {new Date(ev.event_date).toLocaleString("pt-BR")}
                </p>
                {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
              </div>
              {canManage && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => remove(ev.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
        {!events.length && <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento agendado</p>}
      </div>
    </ResponsiveDialog>
  );
}
