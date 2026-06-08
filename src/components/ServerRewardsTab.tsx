import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useAddXPReward, useRemoveXPReward, useServerXPRewards, useServerRoles } from "@/hooks/servers";
import { ProgressBar } from "@/components/ui/progress-bar";

const REWARD_TYPES = [
  { value: "role", label: "Cargo" },
  { value: "item", label: "Item" },
  { value: "custom", label: "Personalizado" },
] as const;

type RewardType = (typeof REWARD_TYPES)[number]["value"];

export function ServerRewardsTab({ serverId, canManage }: { serverId: string; canManage: boolean }) {
  const { data: rewards = [], isLoading } = useServerXPRewards(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const addReward = useAddXPReward(serverId);
  const removeReward = useRemoveXPReward(serverId);
  const [newThreshold, setNewThreshold] = useState(5);
  const [newType, setNewType] = useState<RewardType>("role");
  const [newValue, setNewValue] = useState(roles[0]?.id ?? "");
  const [newMessage, setNewMessage] = useState("");

  const roleOptions = useMemo(() => roles.map((role: any) => ({ id: role.id, name: role.name })), [roles]);

  const thresholdLabel = `Nível ${newThreshold}`;

  const create = async () => {
    if (!canManage) {
      toast.error("Apenas gerentes podem adicionar recompensas.");
      return;
    }
    if (!newValue.trim()) {
      toast.error("Defina um valor para a recompensa.");
      return;
    }
    addReward.mutate({ level_threshold: newThreshold, reward_type: newType, reward_value: newValue, message: newMessage || null });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-border/70 bg-card/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Recompensas de nível</h3>
            <p className="text-xs text-muted-foreground">Defina recompensas automáticas que seus membros ganham ao subir de nível.</p>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div>Recompensas cadastradas: <span className="font-semibold text-foreground">{rewards.length}</span></div>
            <Badge variant="outline" className="bg-muted-foreground/5 text-muted-foreground">Nível mínimo 5</Badge>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Threshold</Label>
              <Input type="number" min={1} value={newThreshold} onChange={(e) => setNewThreshold(Number(e.target.value))} className="h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Tipo</Label>
              <Select value={newType} onValueChange={(value) => setNewType(value as RewardType)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Tipo" /></SelectTrigger>
                <SelectContent>
                  {REWARD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="h-10" onClick={create} disabled={addReward.isPending || !canManage}>
            <Plus className="h-4 w-4" /> Adicionar regra
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Valor da recompensa</Label>
            {newType === "role" ? (
              <Select value={newValue} onValueChange={(value) => setNewValue(value)}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione um cargo" /></SelectTrigger>
                <SelectContent>
                  {roleOptions.length ? roleOptions.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  )) : (
                    <SelectItem value="">Nenhum cargo disponível</SelectItem>
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={newType === "item" ? "Nome do item" : "Descrição personalizada"} className="h-10" />
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Mensagem</Label>
            <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Mensagem opcional" className="h-10" />
          </div>
        </div>
      </Card>

      <Card className="p-4 border border-border/70 bg-card/80">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-sm font-semibold">Regras atuais</h4>
            <p className="text-xs text-muted-foreground">As recompensas são concedidas automaticamente quando o membro atinge o nível definido.</p>
          </div>
          <Badge variant="secondary" className="text-xs">Total: {rewards.length}</Badge>
        </div>

        <ScrollArea className="max-h-[52vh] pr-2 -mr-2">
          <div className="space-y-3">
            {rewards.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">Nenhuma regra cadastrada ainda.</div>
            ) : rewards.map((reward: any) => (
              <div key={reward.id} className="rounded-2xl border border-border p-4 bg-background/70 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap gap-2 items-center text-sm font-semibold text-foreground">
                    <span>{reward.level_threshold}º nível</span>
                    <Badge variant="outline" className="text-xs">{reward.reward_type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{reward.reward_type === "role" ? `Cargo: ${roles.find((r: any) => r.id === reward.reward_value)?.name ?? reward.reward_value}` : reward.reward_value}</p>
                  {reward.message && <p className="text-xs text-muted-foreground/80">{reward.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={Math.min(reward.level_threshold, 100)} max={100} label="Prioridade" />
                  <Button variant="outline" size="sm" className="h-9" onClick={() => removeReward.mutate(reward.id)} disabled={removeReward.isPending || !canManage}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
