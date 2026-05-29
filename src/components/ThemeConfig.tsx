import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Palette } from "lucide-react";

export function ThemeDialog({ serverId, server, canManage }: { serverId: string; server: any; canManage: boolean }) {
  const [accent, setAccent] = useState(server?.theme_config?.accent || "#d97706");
  const [bg, setBg] = useState(server?.theme_config?.background || "#1a120b");
  const [mode, setMode] = useState(server?.theme_config?.mode || "dark");
  const [font, setFont] = useState(server?.theme_config?.font || "default");

  async function save() {
    const { error } = await supabase.from("servers").update({
      theme_config: { accent, background: bg, mode, font },
    } as any).eq("id", serverId);
    if (error) toast.error(error.message); else toast.success("Tema salvo!");
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={!canManage}><Palette className="h-4 w-4 mr-1" />Tema</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Tema do servidor</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <div className="space-y-1 flex-1"><Label className="text-xs">Cor principal</Label><Input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 p-1" /></div>
            <div className="space-y-1 flex-1"><Label className="text-xs">Fundo</Label><Input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="h-9 p-1" /></div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Modo escuro</Label>
            <Switch checked={mode === "dark"} onCheckedChange={(v) => setMode(v ? "dark" : "light")} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fonte</Label>
            <select value={font} onChange={(e) => setFont(e.target.value)} className="w-full rounded-md border border-border bg-background h-9 px-2 text-sm">
              <option value="default">Padrão do sistema</option>
              <option value="comic">Comic Neue (retrô)</option>
              <option value="arial">Arial (nostálgico)</option>
              <option value="mono">Monospace (hacker)</option>
            </select>
          </div>
          <Button onClick={save} className="w-full">Salvar tema</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
