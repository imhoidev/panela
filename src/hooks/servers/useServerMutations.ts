import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ------------------------------------------------------------------ HELPERS
function cancelAndSnapshot<T>(qc: ReturnType<typeof useQueryClient>, key: unknown[]) {
  return async () => {
    await qc.cancelQueries({ queryKey: key });
    return qc.getQueryData<T>(key);
  };
}

// ------------------------------------------------------------------- SERVERS
export function useUpdateServer(serverId: string) {
  const qc = useQueryClient();
  const key = ["server", serverId];
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("servers").update(updates as any).eq("id", serverId);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any) => old ? { ...old, ...updates } : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao salvar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteServer(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("servers").delete().eq("id", serverId);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["servers"] });
      const prev = qc.getQueryData(["servers"]);
      qc.setQueryData(["servers"], (old: any[]) => old?.filter((s: any) => s.id !== serverId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["servers"], ctx.prev);
      toast.error("Erro ao deletar servidor");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["servers"] }),
  });
}

// ----------------------------------------------------------------- CHANNELS
export function useCreateChannel(serverId: string) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async (channel: { name: string; type: string; position: number; category?: string | null }) => {
      const { data, error } = await supabase.from("channels").insert({ server_id: serverId, ...channel, type: channel.type as any } as any).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (channel) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => [...(old ?? []), { id: `temp-${Date.now()}`, ...channel }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao criar canal");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateChannel(serverId: string) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from("channels").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.map((c: any) => c.id === id ? { ...c, ...updates } : c) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao salvar"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useReorderChannels(serverId: string) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async (items: Array<{ id: string; position?: number | null; category?: string | null }>) => {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${apiUrl}/api/channels/reorder`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(items),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Erro ao reordenar canais"); }
    },
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.map((ch: any) => { const i = items.find((x) => x.id === ch.id); return i ? { ...ch, ...i } : ch; }) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao reordenar canais"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteChannel(serverId: string) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", channelId);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.filter((c: any) => c.id !== channelId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao deletar"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// ------------------------------------------------------------------ MEMBERS
export function useKickMember(serverId: string) {
  const qc = useQueryClient();
  const key = ["members", serverId];
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.filter((m: any) => m.user_id !== userId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao remover membro"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUpdateMemberLevel(serverId: string) {
  const qc = useQueryClient();
  const key = ["members", serverId];
  return useMutation({
    mutationFn: async ({ userId, level }: { userId: string; level: number }) => {
      const { error } = await supabase.from("server_members").update({ level }).eq("server_id", serverId).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async ({ userId, level }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.map((m: any) => m.user_id === userId ? { ...m, level } : m) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao atualizar nível"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// --------------------------------------------------------------- BANS / MUTES
export function useBanMember(serverId: string) {
  const qc = useQueryClient();
  const bansKey = ["bans", serverId];
  return useMutation({
    mutationFn: async ({ userId, reason, hours }: { userId: string; reason?: string; hours?: string }) => {
      const expiresAt = hours ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null;
      const { data, error } = await supabase.from("server_bans").insert({
        server_id: serverId, user_id: userId, reason: reason || null,
        banned_by: (await supabase.auth.getSession()).data.session?.user.id || "",
        expires_at: expiresAt,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, reason, hours }) => {
      await qc.cancelQueries({ queryKey: bansKey });
      const prev = qc.getQueryData(bansKey);
      qc.setQueryData(bansKey, (old: any[]) => [...(old ?? []), {
        id: `temp-${Date.now()}`, server_id: serverId, user_id: userId, reason: reason ?? null,
        expires_at: hours ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null,
        banned_by: undefined,
      }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(bansKey, ctx.prev); toast.error("Erro ao banir"); },
    onSettled: () => qc.invalidateQueries({ queryKey: bansKey }),
  });
}

export function useUnbanMember(serverId: string) {
  const qc = useQueryClient();
  const key = ["bans", serverId];
  return useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase.from("server_bans").delete().eq("id", banId);
      if (error) throw error;
    },
    onMutate: async (banId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.filter((b: any) => b.id !== banId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao remover banimento"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useMuteMember(serverId: string) {
  const qc = useQueryClient();
  const key = ["mutes", serverId];
  return useMutation({
    mutationFn: async ({ userId, reason, hours }: { userId: string; reason?: string; hours?: string }) => {
      const expiresAt = hours ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null;
      const { data, error } = await supabase.from("server_mutes").insert({
        server_id: serverId, user_id: userId, reason: reason || null,
        muted_by: (await supabase.auth.getSession()).data.session?.user.id || "",
        expires_at: expiresAt,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, reason, hours }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => [...(old ?? []), {
        id: `temp-${Date.now()}`, server_id: serverId, user_id: userId, reason: reason ?? null,
        muted_by: undefined, created_at: new Date().toISOString(),
        expires_at: hours ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null,
      }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao silenciar"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useUnmuteMember(serverId: string) {
  const qc = useQueryClient();
  const key = ["mutes", serverId];
  return useMutation({
    mutationFn: async (muteId: string) => {
      const { error } = await supabase.from("server_mutes").delete().eq("id", muteId);
      if (error) throw error;
    },
    onMutate: async (muteId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: any[]) => old?.filter((m: any) => m.id !== muteId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao remover silêncio"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// --------------------------------------------------------------- ROLES
export function useAssignRole(serverId: string) {
  const qc = useQueryClient();
  const key = ["memberRoleMap", serverId];
  return useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) => {
      const { error } = await supabase.from("server_member_roles").insert({ member_id: memberId, role_id: roleId });
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: Map<string, string[]>) => {
        const next = new Map(old);
        const list = next.get(memberId) ?? [];
        next.set(memberId, [...list, roleId]);
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao atribuir cargo"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveRole(serverId: string) {
  const qc = useQueryClient();
  const key = ["memberRoleMap", serverId];
  return useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) => {
      const { error } = await supabase.from("server_member_roles").delete().eq("member_id", memberId).eq("role_id", roleId);
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: Map<string, string[]>) => {
        const next = new Map(old);
        const list = next.get(memberId) ?? [];
        next.set(memberId, list.filter((r: string) => r !== roleId));
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(key, ctx.prev); toast.error("Erro ao remover cargo"); },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

// --------------------------------------------------------------- XP REWARDS
export function useAddXPReward(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reward: { level_threshold: number; reward_type: "role" | "item" | "custom"; reward_value: string; message?: string | null }) => {
      const { error } = await (supabase as any).from("server_level_rewards").insert({ server_id: serverId, ...reward });
      if (error) throw error;
    },
    onMutate: async (reward) => {
      await qc.cancelQueries({ queryKey: ["serverXPRewards", serverId] });
      const prev = qc.getQueryData(["serverXPRewards", serverId]);
      qc.setQueryData(["serverXPRewards", serverId], (old: any[]) => [...(old ?? []), { ...reward, id: `temp-${Date.now()}` }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(["serverXPRewards", serverId], ctx.prev); toast.error("Erro ao criar regra"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["serverXPRewards", serverId] }),
  });
}

export function useRemoveXPReward(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await (supabase as any).from("server_level_rewards").delete().eq("id", rewardId).eq("server_id", serverId);
      if (error) throw error;
    },
    onMutate: async (rewardId) => {
      await qc.cancelQueries({ queryKey: ["serverXPRewards", serverId] });
      const prev = qc.getQueryData(["serverXPRewards", serverId]);
      qc.setQueryData(["serverXPRewards", serverId], (old: any[]) => old?.filter((r: any) => r.id !== rewardId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(["serverXPRewards", serverId], ctx.prev); toast.error("Erro ao remover regra"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["serverXPRewards", serverId] }),
  });
}

// --------------------------------------------------------------- ACHIEVEMENTS / BOOKMARKS / TOPIC
export function useAwardAchievement(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { userId: string; achievementKey: string; message?: string | null }) => {
      const { error } = await (supabase.rpc as any)("award_server_achievement", {
        _server_id: serverId, _user_id: payload.userId,
        _achievement_key: payload.achievementKey, _message: payload.message ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["serverAchievements", serverId, variables.userId] });
      toast.success("Conquista registrada");
    },
    onError: (err: any) => toast.error(err.message || "Erro ao registrar conquista"),
  });
}

export function useToggleBookmark(userId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { message_id: string; note?: string | null }) => {
      if (!userId) throw new Error("Usuário não autenticado");
      const { error } = await (supabase as any).from("message_bookmarks").upsert(
        { user_id: userId, message_id: payload.message_id, note: payload.note ?? null },
        { onConflict: ["user_id", "message_id"] }
      );
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["messageBookmarks", userId] }); toast.success("Bookmark atualizado"); },
    onError: (err: any) => toast.error(err.message || "Erro ao atualizar bookmark"),
  });
}

export function useUpdateTopic(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (topic: string) => {
      const { error } = await (supabase.rpc as any)("update_channel_topic", { _channel_id: channelId, _topic: topic });
      if (error) throw error;
    },
    onMutate: async (topic) => {
      await qc.cancelQueries({ queryKey: ["channelTopicHistory", channelId] });
      const prev = qc.getQueryData(["channelTopicHistory", channelId]);
      qc.setQueryData(["channelTopicHistory", channelId], (old: any[]) => [...(old ?? []), { topic, updated_at: new Date().toISOString() }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(["channelTopicHistory", channelId], ctx.prev); toast.error("Erro ao atualizar tópico"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["channelTopicHistory", channelId] }),
  });
}
