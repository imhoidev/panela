import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUpdateServer(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("servers").update(updates).eq("id", serverId);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ["server", serverId] });
      const prev = qc.getQueryData(["server", serverId]);
      qc.setQueryData(["server", serverId], (old: any) => old ? { ...old, ...updates } : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["server", serverId], ctx.prev);
      toast.error("Erro ao salvar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["server", serverId] }),
  });
}

export function useDeleteServer(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("servers").delete().eq("id", serverId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servers"] });
      toast.success("Servidor deletado");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useCreateChannel(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channel: { name: string; type: string; position: number; category?: string | null }) => {
      const { error } = await supabase.from("channels").insert({ server_id: serverId, ...channel });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", serverId] }),
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateChannel(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from("channels").update(updates).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ["channels", serverId] });
      const prev = qc.getQueryData(["channels", serverId]);
      qc.setQueryData(["channels", serverId], (old: any[]) =>
        old?.map((c: any) => c.id === id ? { ...c, ...updates } : c) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(["channels", serverId], ctx.prev); toast.error("Erro ao salvar"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["channels", serverId] }),
  });
}

export function useReorderChannels(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; position?: number | null; category?: string | null }>) => {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${apiUrl}/api/channels/reorder`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(items),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao reordenar canais");
      }
    },
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: ["channels", serverId] });
      const prev = qc.getQueryData(["channels", serverId]);
      qc.setQueryData(["channels", serverId], (old: any[]) =>
        old?.map((channel: any) => {
          const item = items.find((i) => i.id === channel.id);
          return item ? { ...channel, ...item } : channel;
        }) ?? []
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["channels", serverId], ctx.prev);
      toast.error("Erro ao reordenar canais");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["channels", serverId] }),
  });
}

export function useDeleteChannel(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (channelId: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", channelId);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await qc.cancelQueries({ queryKey: ["channels", serverId] });
      const prev = qc.getQueryData(["channels", serverId]);
      qc.setQueryData(["channels", serverId], (old: any[]) => old?.filter((c: any) => c.id !== channelId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(["channels", serverId], ctx.prev); toast.error("Erro ao deletar"); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["channels", serverId] }),
  });
}

export function useKickMember(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["members", serverId] }); toast.success("Membro removido"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useBanMember(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason, hours }: { userId: string; reason?: string; hours?: string }) => {
      const expiresAt = hours ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null;
      const { error } = await supabase.from("server_bans").insert({
        server_id: serverId, user_id: userId, reason: reason || null,
        banned_by: (await supabase.auth.getSession()).data.session?.user.id,
        expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bans", serverId] }); toast.success("Usuário banido"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUnbanMember(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (banId: string) => {
      const { error } = await supabase.from("server_bans").delete().eq("id", banId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bans", serverId] }); toast.success("Banimento removido"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useMuteMember(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, reason, hours }: { userId: string; reason?: string; hours?: string }) => {
      const expiresAt = hours ? new Date(Date.now() + Number(hours) * 3600000).toISOString() : null;
      const { error } = await supabase.from("server_mutes").insert({
        server_id: serverId, user_id: userId, reason: reason || null,
        muted_by: (await supabase.auth.getSession()).data.session?.user.id,
        expires_at: expiresAt,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mutes", serverId] }); toast.success("Usuário silenciado"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateMemberLevel(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, level }: { userId: string; level: number }) => {
      const { error } = await supabase.from("server_members").update({ level }).eq("server_id", serverId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members", serverId] });
      toast.success("Nível do membro atualizado");
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUnmuteMember(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (muteId: string) => {
      const { error } = await supabase.from("server_mutes").delete().eq("id", muteId);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mutes", serverId] }); toast.success("Silêncio removido"); },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useAssignRole(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) => {
      const { error } = await supabase.from("server_member_roles").insert({ member_id: memberId, role_id: roleId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberRoleMap", serverId] }),
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRemoveRole(serverId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, roleId }: { memberId: string; roleId: string }) => {
      const { error } = await supabase.from("server_member_roles").delete().eq("member_id", memberId).eq("role_id", roleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memberRoleMap", serverId] }),
    onError: (err: any) => toast.error(err.message),
  });
}
