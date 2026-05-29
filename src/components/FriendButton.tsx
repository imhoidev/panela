import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck, UserX, MessageSquare, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

export function FriendButton({ targetUserId }: { targetUserId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"none" | "pending" | "accepted" | "requested" | "loading">("loading");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("friends")
      .select("status, user_id, friend_id")
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)
      .then(({ data }) => {
        if (!data?.length) return setStatus("none");
        const rel = data[0] as any;
        if (rel.status === "accepted") setStatus("accepted");
        else if (rel.user_id === user.id) setStatus("pending");
        else setStatus("requested");
      });
  }, [user?.id, targetUserId]);

  async function startDM() {
    if (!user) return;
    const { data: existing } = await supabase
      .from("dm_participants")
      .select("conversation_id")
      .eq("user_id", user.id);
    const convIds = [...new Set((existing ?? []).map((p: any) => p.conversation_id))];
    if (convIds.length) {
      const { data: shared } = await supabase
        .from("dm_participants")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .eq("user_id", targetUserId);
      if (shared?.length) {
        navigate({ to: "/app/dms/$conversationId", params: { conversationId: shared[0].conversation_id } });
        return;
      }
    }
    // Pre-generate UUID so we don't need to SELECT after INSERT (avoids RLS chicken-and-egg)
    const convId = crypto.randomUUID();
    const { error } = await supabase.from("dm_conversations").insert({ id: convId });
    if (error) { toast.error(error.message); return; }
    await supabase.from("dm_participants").insert([
      { conversation_id: convId, user_id: user.id },
      { conversation_id: convId, user_id: targetUserId },
    ]);
    navigate({ to: "/app/dms/$conversationId", params: { conversationId: convId } });
  }

  async function addFriend() {
    if (!user) return;
    setActionLoading(true);
    const { error } = await supabase.from("friends").insert({
      user_id: user.id, friend_id: targetUserId,
    });
    setActionLoading(false);
    if (error) return toast.error(error.message);
    setStatus("pending");
    toast.success("Solicitação enviada!");
  }

  async function acceptFriend() {
    setActionLoading(true);
    const { error } = await supabase.from("friends")
      .update({ status: "accepted" })
      .eq("user_id", targetUserId)
      .eq("friend_id", user!.id);
    setActionLoading(false);
    if (error) return toast.error(error.message);
    setStatus("accepted");
    toast.success("Amizade aceita!");
  }

  if (!user || targetUserId === user.id) return null;

  return (
    <div className="flex gap-1.5">
      <Button size="sm" variant="outline" onClick={startDM} className="gap-1.5">
        <MessageSquare className="h-4 w-4" /> Mensagem
      </Button>
      {status === "none" && (
        <Button size="sm" variant="outline" onClick={addFriend} disabled={actionLoading} className="gap-1.5">
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Adicionar
        </Button>
      )}
      {status === "pending" && (
        <Button size="sm" variant="outline" className="gap-1.5 text-muted-foreground" disabled>
          <UserX className="h-4 w-4" /> Solicitado
        </Button>
      )}
      {status === "requested" && (
        <Button size="sm" variant="default" onClick={acceptFriend} disabled={actionLoading} className="gap-1.5">
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
          Aceitar
        </Button>
      )}
      {status === "accepted" && (
        <Button size="sm" variant="outline" className="gap-1.5 text-emerald-500" disabled>
          <UserCheck className="h-4 w-4" /> Amigos
        </Button>
      )}
    </div>
  );
}
