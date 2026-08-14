import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import * as React from "react";
import { useState, useEffect } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { c as cn, B as Button } from "./button-DjOZMqFS.js";
import { s as supabase } from "./router-mRNo7IUv.js";
import { R as ResponsiveDialog } from "./responsive-dialog-B76QsuFm.js";
import { I as Input } from "./input-D_U8fI25.js";
import { L as Label } from "./label-C8WJLhmR.js";
import { S as Select, c as SelectTrigger, d as SelectValue, a as SelectContent, b as SelectItem } from "./select-aG-zsZPc.js";
import { A as Avatar, b as AvatarImage, a as AvatarFallback } from "./avatar-Tfr5UmpM.js";
import { S as ScrollArea } from "./scroll-area-JK6xafWT.js";
import { toast } from "sonner";
import { Search, Volume2, VolumeX, ShieldCheck, Ban, FileText, Gavel, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
function Skeleton({ className, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn("animate-pulse rounded-md bg-primary/10", className), ...props });
}
function useServerDetails(serverId) {
  return useQuery({
    queryKey: ["server", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("servers").select("*").eq("id", serverId).maybeSingle();
      return data;
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useServerChannels(serverId) {
  return useQuery({
    queryKey: ["channels", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("*").eq("server_id", serverId).order("position");
      return data ?? [];
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useServerMembers(serverId) {
  return useQuery({
    queryKey: ["members", serverId],
    queryFn: async () => {
      const { data: mems } = await supabase.from("server_members").select("id, user_id, level, nickname, joined_at").eq("server_id", serverId);
      if (!mems?.length) return [];
      const userIds = mems.map((m) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url, name_color, name_colors, name_effect, current_plan, status_text").in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return mems.map((m) => ({ ...m, profiles: profMap[m.user_id] || null }));
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useServerRoles(serverId) {
  return useQuery({
    queryKey: ["roles", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_roles").select("*").eq("server_id", serverId).order("level", { ascending: false });
      return data ?? [];
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useMemberLevel(serverId, userId) {
  return useQuery({
    queryKey: ["memberLevel", serverId, userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { data } = await supabase.from("server_members").select("level").eq("server_id", serverId).eq("user_id", userId).maybeSingle();
      return data?.level ?? 0;
    },
    enabled: !!serverId && !!userId,
    staleTime: 6e4
  });
}
function useServerBans(serverId) {
  return useQuery({
    queryKey: ["bans", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_bans").select("*").eq("server_id", serverId);
      const list = data ?? [];
      if (!list.length) return [];
      const userIds = list.map((b) => b.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return list.map((b) => ({ ...b, profiles: profMap[b.user_id] || null }));
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useServerMutes(serverId) {
  return useQuery({
    queryKey: ["mutes", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_mutes").select("*").eq("server_id", serverId);
      const list = data ?? [];
      if (!list.length) return [];
      const userIds = list.map((m) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return list.map((m) => ({ ...m, profiles: profMap[m.user_id] || null }));
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useMemberRoleMap(serverId) {
  return useQuery({
    queryKey: ["memberRoleMap", serverId],
    queryFn: async () => {
      const map = /* @__PURE__ */ new Map();
      const { data } = await supabase.from("server_member_roles").select("member_id, role_id, server_members!inner(user_id)").eq("server_members.server_id", serverId);
      (data ?? []).forEach((mr) => {
        const uid = mr.server_members?.user_id;
        if (!uid) return;
        const ids = map.get(uid) ?? [];
        ids.push(mr.role_id);
        map.set(uid, ids);
      });
      return map;
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useServerXP(serverId, userId) {
  return useQuery({
    queryKey: ["serverXP", serverId, userId],
    queryFn: async () => {
      if (!userId) return { xp: 0, level: 0, nextXp: 10, progress: 0, nextLevel: 1 };
      const { data } = await supabase.from("server_xp").select("xp").eq("server_id", serverId).eq("user_id", userId).maybeSingle();
      const xp = data?.xp ?? 0;
      const level = Math.floor(Math.sqrt(xp / 10));
      const nextXp = (level + 1) ** 2 * 10;
      return {
        xp,
        level,
        nextXp,
        nextLevel: level + 1,
        progress: xp / Math.max(nextXp, 1)
      };
    },
    enabled: !!serverId && !!userId,
    staleTime: 3e4
  });
}
function useServerXPRewards(serverId) {
  return useQuery({
    queryKey: ["serverXPRewards", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_level_rewards").select("*").eq("server_id", serverId).order("level_threshold", { ascending: true });
      return data ?? [];
    },
    enabled: !!serverId,
    staleTime: 3e4
  });
}
function useServerAuditLogs(serverId) {
  return useQuery({
    queryKey: ["auditLogs", serverId],
    queryFn: async () => {
      const { data: logs } = await supabase.from("moderation_logs").select("*").eq("server_id", serverId).order("created_at", { ascending: false }).limit(100);
      const list = logs ?? [];
      if (!list.length) return [];
      const userIds = [...new Set(list.flatMap((l) => [l.target_user_id, l.mod_user_id]).filter(Boolean))];
      if (!userIds.length) return list;
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      return list.map((l) => ({
        ...l,
        target_profile: profMap[l.target_user_id] || null,
        mod_profile: profMap[l.mod_user_id] || null
      }));
    },
    enabled: !!serverId,
    staleTime: 15e3
  });
}
function useUpdateServer(serverId) {
  const qc = useQueryClient();
  const key = ["server", serverId];
  return useMutation({
    mutationFn: async (updates) => {
      const { error } = await supabase.from("servers").update(updates).eq("id", serverId);
      if (error) throw error;
    },
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old ? { ...old, ...updates } : old);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao salvar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useDeleteServer(serverId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("servers").delete().eq("id", serverId);
      if (error) throw error;
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ["servers"] });
      const prev = qc.getQueryData(["servers"]);
      qc.setQueryData(["servers"], (old) => old?.filter((s) => s.id !== serverId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["servers"], ctx.prev);
      toast.error("Erro ao deletar servidor");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["servers"] })
  });
}
function useCreateChannel(serverId) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async (channel) => {
      const { data, error } = await supabase.from("channels").insert({ server_id: serverId, ...channel, type: channel.type }).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async (channel) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => [...old ?? [], { id: `temp-${Date.now()}`, ...channel }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao criar canal");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useUpdateChannel(serverId) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { error } = await supabase.from("channels").update(updates).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.map((c) => c.id === id ? { ...c, ...updates } : c) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao salvar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useReorderChannels(serverId) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async (items) => {
      const apiUrl = "";
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${apiUrl}/api/channels/reorder`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(items)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao reordenar canais");
      }
    },
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.map((ch) => {
        const i = items.find((x) => x.id === ch.id);
        return i ? { ...ch, ...i } : ch;
      }) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao reordenar canais");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useDeleteChannel(serverId) {
  const qc = useQueryClient();
  const key = ["channels", serverId];
  return useMutation({
    mutationFn: async (channelId) => {
      const { error } = await supabase.from("channels").delete().eq("id", channelId);
      if (error) throw error;
    },
    onMutate: async (channelId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.filter((c) => c.id !== channelId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao deletar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useKickMember(serverId) {
  const qc = useQueryClient();
  const key = ["members", serverId];
  return useMutation({
    mutationFn: async (userId) => {
      const { error } = await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async (userId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.filter((m) => m.user_id !== userId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao remover membro");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useUpdateMemberLevel(serverId) {
  const qc = useQueryClient();
  const key = ["members", serverId];
  return useMutation({
    mutationFn: async ({ userId, level }) => {
      const { error } = await supabase.from("server_members").update({ level }).eq("server_id", serverId).eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: async ({ userId, level }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.map((m) => m.user_id === userId ? { ...m, level } : m) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao atualizar nível");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useBanMember(serverId) {
  const qc = useQueryClient();
  const bansKey = ["bans", serverId];
  return useMutation({
    mutationFn: async ({ userId, reason, hours }) => {
      const expiresAt = hours ? new Date(Date.now() + Number(hours) * 36e5).toISOString() : null;
      const { data, error } = await supabase.from("server_bans").insert({
        server_id: serverId,
        user_id: userId,
        reason: reason || null,
        banned_by: (await supabase.auth.getSession()).data.session?.user.id || "",
        expires_at: expiresAt
      }).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, reason, hours }) => {
      await qc.cancelQueries({ queryKey: bansKey });
      const prev = qc.getQueryData(bansKey);
      qc.setQueryData(bansKey, (old) => [...old ?? [], {
        id: `temp-${Date.now()}`,
        server_id: serverId,
        user_id: userId,
        reason: reason ?? null,
        expires_at: hours ? new Date(Date.now() + Number(hours) * 36e5).toISOString() : null,
        banned_by: void 0
      }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(bansKey, ctx.prev);
      toast.error("Erro ao banir");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: bansKey })
  });
}
function useUnbanMember(serverId) {
  const qc = useQueryClient();
  const key = ["bans", serverId];
  return useMutation({
    mutationFn: async (banId) => {
      const { error } = await supabase.from("server_bans").delete().eq("id", banId);
      if (error) throw error;
    },
    onMutate: async (banId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.filter((b) => b.id !== banId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao remover banimento");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useMuteMember(serverId) {
  const qc = useQueryClient();
  const key = ["mutes", serverId];
  return useMutation({
    mutationFn: async ({ userId, reason, hours }) => {
      const expiresAt = hours ? new Date(Date.now() + Number(hours) * 36e5).toISOString() : null;
      const { data, error } = await supabase.from("server_mutes").insert({
        server_id: serverId,
        user_id: userId,
        reason: reason || null,
        muted_by: (await supabase.auth.getSession()).data.session?.user.id || "",
        expires_at: expiresAt
      }).select().single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ userId, reason, hours }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => [...old ?? [], {
        id: `temp-${Date.now()}`,
        server_id: serverId,
        user_id: userId,
        reason: reason ?? null,
        muted_by: void 0,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        expires_at: hours ? new Date(Date.now() + Number(hours) * 36e5).toISOString() : null
      }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao silenciar");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useUnmuteMember(serverId) {
  const qc = useQueryClient();
  const key = ["mutes", serverId];
  return useMutation({
    mutationFn: async (muteId) => {
      const { error } = await supabase.from("server_mutes").delete().eq("id", muteId);
      if (error) throw error;
    },
    onMutate: async (muteId) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => old?.filter((m) => m.id !== muteId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao remover silêncio");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useAssignRole(serverId) {
  const qc = useQueryClient();
  const key = ["memberRoleMap", serverId];
  return useMutation({
    mutationFn: async ({ memberId, roleId }) => {
      const { error } = await supabase.from("server_member_roles").insert({ member_id: memberId, role_id: roleId });
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        const next = new Map(old);
        const list = next.get(memberId) ?? [];
        next.set(memberId, [...list, roleId]);
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao atribuir cargo");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useRemoveRole(serverId) {
  const qc = useQueryClient();
  const key = ["memberRoleMap", serverId];
  return useMutation({
    mutationFn: async ({ memberId, roleId }) => {
      const { error } = await supabase.from("server_member_roles").delete().eq("member_id", memberId).eq("role_id", roleId);
      if (error) throw error;
    },
    onMutate: async ({ memberId, roleId }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        const next = new Map(old);
        const list = next.get(memberId) ?? [];
        next.set(memberId, list.filter((r) => r !== roleId));
        return next;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error("Erro ao remover cargo");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key })
  });
}
function useAddXPReward(serverId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reward) => {
      const { error } = await supabase.from("server_level_rewards").insert({ server_id: serverId, ...reward });
      if (error) throw error;
    },
    onMutate: async (reward) => {
      await qc.cancelQueries({ queryKey: ["serverXPRewards", serverId] });
      const prev = qc.getQueryData(["serverXPRewards", serverId]);
      qc.setQueryData(["serverXPRewards", serverId], (old) => [...old ?? [], { ...reward, id: `temp-${Date.now()}` }]);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["serverXPRewards", serverId], ctx.prev);
      toast.error("Erro ao criar regra");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["serverXPRewards", serverId] })
  });
}
function useRemoveXPReward(serverId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId) => {
      const { error } = await supabase.from("server_level_rewards").delete().eq("id", rewardId).eq("server_id", serverId);
      if (error) throw error;
    },
    onMutate: async (rewardId) => {
      await qc.cancelQueries({ queryKey: ["serverXPRewards", serverId] });
      const prev = qc.getQueryData(["serverXPRewards", serverId]);
      qc.setQueryData(["serverXPRewards", serverId], (old) => old?.filter((r) => r.id !== rewardId) ?? []);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["serverXPRewards", serverId], ctx.prev);
      toast.error("Erro ao remover regra");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["serverXPRewards", serverId] })
  });
}
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(PopoverPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  PopoverPrimitive.Content,
  {
    ref,
    align,
    sideOffset,
    className: cn(
      "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
function ReportDialog({ messageId, channelId }) {
  const [reason, setReason] = useState("spam");
  const [open, setOpen] = useState(false);
  async function report() {
    const { error } = await supabase.from("moderation_reports").insert({
      message_id: messageId,
      channel_id: channelId,
      reason,
      reported_by: (await supabase.auth.getSession()).data.session?.user.id || ""
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Reportado à moderação");
      setOpen(false);
    }
  }
  return /* @__PURE__ */ jsx(
    ResponsiveDialog,
    {
      open,
      onOpenChange: setOpen,
      title: "Reportar mensagem",
      trigger: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-destructive/70 hover:text-destructive", children: /* @__PURE__ */ jsx(AlertTriangle, { className: "h-4 w-4" }) }),
      children: /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsxs(Select, { value: reason, onValueChange: setReason, children: [
          /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
          /* @__PURE__ */ jsxs(SelectContent, { children: [
            /* @__PURE__ */ jsx(SelectItem, { value: "spam", children: "Spam" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "harassment", children: "Assédio" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "hate", children: "Discurso de ódio" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "nsfw", children: "Conteúdo impróprio" }),
            /* @__PURE__ */ jsx(SelectItem, { value: "other", children: "Outro" })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Button, { onClick: report, className: "w-full h-10", children: "Enviar report" })
      ] })
    }
  );
}
function ModeracaoDialog({ serverId, canManage }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("membros");
  const [search, setSearch] = useState("");
  const { data: members = [], isLoading: membersLoading } = useServerMembers(serverId);
  const { data: bans = [], isLoading: bansLoading } = useServerBans(serverId);
  const { data: mutes = [], isLoading: mutesLoading } = useServerMutes(serverId);
  const { data: auditLogs = [], isLoading: logsLoading } = useServerAuditLogs(serverId);
  const banMutation = useBanMember(serverId);
  const unbanMutation = useUnbanMember(serverId);
  const muteMutation = useMuteMember(serverId);
  const unmuteMutation = useUnmuteMember(serverId);
  const [muteTarget, setMuteTarget] = useState(null);
  const [muteReason, setMuteReason] = useState("");
  const [muteHours, setMuteHours] = useState("");
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [banHours, setBanHours] = useState("");
  useEffect(() => {
    if (!open) return;
    setSearch("");
    setBanReason("");
    setBanHours("");
    setBanTarget(null);
    setMuteReason("");
    setMuteHours("");
    setMuteTarget(null);
  }, [open]);
  const filtered = members.filter((m) => {
    if (!search) return true;
    const p = m.profiles;
    return p?.username?.toLowerCase().includes(search.toLowerCase()) || p?.display_name?.toLowerCase().includes(search.toLowerCase());
  });
  return /* @__PURE__ */ jsx(
    ResponsiveDialog,
    {
      open,
      onOpenChange: setOpen,
      title: "Moderação & Auditoria",
      trigger: /* @__PURE__ */ jsxs(Button, { variant: "ghost", size: "sm", disabled: !canManage, className: "text-destructive", children: [
        /* @__PURE__ */ jsx(Gavel, { className: "h-4 w-4 mr-1" }),
        "Mod."
      ] }),
      children: /* @__PURE__ */ jsxs("div", { className: "space-y-3 min-h-[340px]", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex gap-1 bg-muted/20 p-1 rounded-lg", children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTab("membros"),
              className: `flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "membros" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
              children: "Membros"
            }
          ),
          /* @__PURE__ */ jsxs(
            "button",
            {
              onClick: () => setTab("banidos"),
              className: `flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "banidos" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
              children: [
                "Banidos (",
                bans.length,
                ")"
              ]
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setTab("logs"),
              className: `flex-1 py-1.5 rounded text-xs font-medium transition-colors ${tab === "logs" ? "bg-accent text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
              children: "Logs de Auditoria"
            }
          )
        ] }),
        tab === "membros" && /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" }),
            /* @__PURE__ */ jsx(
              Input,
              {
                value: search,
                onChange: (e) => setSearch(e.target.value),
                placeholder: "Buscar membros...",
                className: "pl-8 h-9 text-sm"
              }
            )
          ] }),
          membersLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-1", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-11 w-full rounded-lg" }, i)) }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-[300px] -mx-1 px-1", children: /* @__PURE__ */ jsx("div", { className: "space-y-0.5", children: filtered.map((m) => {
            const p = m.profiles;
            const isBanned = bans.some((b) => b.user_id === m.user_id);
            const isMuted = mutes.some((mu) => mu.user_id === m.user_id);
            return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors group", children: [
              /* @__PURE__ */ jsxs(Avatar, { className: "h-7 w-7 shrink-0", children: [
                /* @__PURE__ */ jsx(AvatarImage, { src: p?.avatar_url ?? void 0 }),
                /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[9px]", children: p?.username?.[0]?.toUpperCase() ?? "?" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", children: p?.display_name || p?.username }),
                /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60", children: [
                  "Nv.",
                  m.level
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1 shrink-0", children: [
                isMuted ? /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    className: "h-7 w-7 text-amber-500",
                    onClick: () => {
                      const mu = mutes.find((x) => x.user_id === m.user_id);
                      if (mu) unmuteMutation.mutate(mu.id);
                    },
                    title: "Remover silêncio",
                    children: /* @__PURE__ */ jsx(Volume2, { className: "h-3.5 w-3.5" })
                  }
                ) : /* @__PURE__ */ jsx(
                  ResponsiveDialog,
                  {
                    title: "Silenciar membro",
                    trigger: /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "ghost",
                        size: "icon",
                        className: "h-7 w-7 text-muted-foreground/40 hover:text-amber-500",
                        title: "Silenciar",
                        children: /* @__PURE__ */ jsx(VolumeX, { className: "h-3.5 w-3.5" })
                      }
                    ),
                    children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                        "Silenciar ",
                        /* @__PURE__ */ jsx("strong", { children: p?.display_name || p?.username })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Motivo" }),
                        /* @__PURE__ */ jsx(Input, { value: muteReason, onChange: (e) => setMuteReason(e.target.value), className: "h-9 text-sm", placeholder: "Opcional" })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Duração (horas)" }),
                        /* @__PURE__ */ jsx(Input, { value: muteHours, onChange: (e) => setMuteHours(e.target.value), className: "h-9 text-sm", placeholder: "Permanente se vazio" })
                      ] }),
                      /* @__PURE__ */ jsx(
                        Button,
                        {
                          onClick: () => {
                            muteMutation.mutate({ userId: m.user_id, reason: muteReason, hours: muteHours });
                            setMuteTarget(null);
                            setMuteReason("");
                            setMuteHours("");
                          },
                          variant: "destructive",
                          className: "w-full h-9 text-xs",
                          children: "Silenciar"
                        }
                      )
                    ] })
                  }
                ),
                isBanned ? /* @__PURE__ */ jsx(
                  Button,
                  {
                    variant: "ghost",
                    size: "icon",
                    className: "h-7 w-7 text-destructive",
                    onClick: () => {
                      const b = bans.find((x) => x.user_id === m.user_id);
                      if (b) unbanMutation.mutate(b.id);
                    },
                    title: "Remover banimento",
                    children: /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5" })
                  }
                ) : /* @__PURE__ */ jsx(
                  ResponsiveDialog,
                  {
                    title: "Banir membro",
                    trigger: /* @__PURE__ */ jsx(
                      Button,
                      {
                        variant: "ghost",
                        size: "icon",
                        className: "h-7 w-7 text-muted-foreground/40 hover:text-destructive",
                        title: "Banir",
                        children: /* @__PURE__ */ jsx(Ban, { className: "h-3.5 w-3.5" })
                      }
                    ),
                    children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                      /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
                        "Banir ",
                        /* @__PURE__ */ jsx("strong", { children: p?.display_name || p?.username })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Motivo" }),
                        /* @__PURE__ */ jsx(Input, { value: banReason, onChange: (e) => setBanReason(e.target.value), className: "h-9 text-sm", placeholder: "Opcional" })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
                        /* @__PURE__ */ jsx(Label, { className: "text-xs", children: "Duração (horas)" }),
                        /* @__PURE__ */ jsx(Input, { value: banHours, onChange: (e) => setBanHours(e.target.value), className: "h-9 text-sm", placeholder: "Permanente se vazio" })
                      ] }),
                      /* @__PURE__ */ jsx(
                        Button,
                        {
                          onClick: () => {
                            banMutation.mutate({ userId: m.user_id, reason: banReason, hours: banHours });
                            setBanTarget(null);
                            setBanReason("");
                            setBanHours("");
                          },
                          variant: "destructive",
                          className: "w-full h-9 text-xs",
                          children: "Banir"
                        }
                      )
                    ] })
                  }
                )
              ] })
            ] }, m.user_id);
          }) }) })
        ] }),
        tab === "banidos" && /* @__PURE__ */ jsx("div", { className: "space-y-2", children: bansLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-1", children: [1, 2].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-11 w-full rounded-lg" }, i)) }) : bans.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground/60 text-center py-8", children: "Nenhum membro banido." }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-[300px] -mx-1 px-1", children: /* @__PURE__ */ jsx("div", { className: "space-y-0.5", children: bans.map((b) => {
          const p = b.profiles;
          return /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 p-2 rounded-lg hover:bg-accent/30 transition-colors group", children: [
            /* @__PURE__ */ jsxs(Avatar, { className: "h-7 w-7 shrink-0", children: [
              /* @__PURE__ */ jsx(AvatarImage, { src: p?.avatar_url ?? void 0 }),
              /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[9px]", children: p?.username?.[0]?.toUpperCase() ?? "?" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", children: p?.display_name || p?.username }),
              /* @__PURE__ */ jsxs("p", { className: "text-[10px] text-muted-foreground/60", children: [
                b.reason || "Sem motivo",
                b.expires_at && /* @__PURE__ */ jsxs(Fragment, { children: [
                  " · Expira ",
                  new Date(b.expires_at).toLocaleDateString("pt-BR")
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx(
              Button,
              {
                variant: "ghost",
                size: "icon",
                className: "h-7 w-7 text-muted-foreground/40 hover:text-emerald-500",
                onClick: () => unbanMutation.mutate(b.id),
                title: "Desbanir",
                children: /* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5" })
              }
            )
          ] }, b.id);
        }) }) }) }),
        tab === "logs" && /* @__PURE__ */ jsx("div", { className: "space-y-2", children: logsLoading ? /* @__PURE__ */ jsx("div", { className: "space-y-1", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsx(Skeleton, { className: "h-11 w-full rounded-lg" }, i)) }) : auditLogs.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center py-8 text-muted-foreground/50", children: [
          /* @__PURE__ */ jsx(FileText, { className: "h-8 w-8 mb-2 opacity-30" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs", children: "Nenhum evento registrado ainda." })
        ] }) : /* @__PURE__ */ jsx(ScrollArea, { className: "h-[300px] -mx-1 px-1", children: /* @__PURE__ */ jsx("div", { className: "space-y-1.5", children: auditLogs.map((log) => /* @__PURE__ */ jsxs("div", { className: "p-2.5 rounded-lg border border-border/50 bg-card/40 text-xs space-y-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-muted-foreground", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-primary/80 uppercase tracking-wider text-[10px]", children: log.action }),
            /* @__PURE__ */ jsx("span", { className: "text-[10px]", children: new Date(log.created_at).toLocaleString("pt-BR") })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1.5 text-foreground/80", children: [
            /* @__PURE__ */ jsxs("span", { children: [
              "Mod: ",
              /* @__PURE__ */ jsx("strong", { children: log.mod_profile?.display_name || log.mod_profile?.username || "Sistema" })
            ] }),
            log.target_profile && /* @__PURE__ */ jsxs("span", { children: [
              "→ Alvo: ",
              /* @__PURE__ */ jsx("strong", { children: log.target_profile?.display_name || log.target_profile?.username })
            ] })
          ] }),
          log.reason && /* @__PURE__ */ jsxs("p", { className: "text-[11px] text-muted-foreground/70 italic", children: [
            '"',
            log.reason,
            '"'
          ] })
        ] }, log.id)) }) }) })
      ] })
    }
  );
}
export {
  useUpdateMemberLevel as A,
  useUpdateServer as B,
  ModeracaoDialog as M,
  Popover as P,
  ReportDialog as R,
  Skeleton as S,
  PopoverContent as a,
  PopoverTrigger as b,
  useAssignRole as c,
  useBanMember as d,
  useCreateChannel as e,
  useDeleteChannel as f,
  useDeleteServer as g,
  useKickMember as h,
  useMemberLevel as i,
  useMemberRoleMap as j,
  useMuteMember as k,
  useRemoveRole as l,
  useRemoveXPReward as m,
  useReorderChannels as n,
  useServerBans as o,
  useServerChannels as p,
  useServerDetails as q,
  useServerMembers as r,
  useServerMutes as s,
  useServerRoles as t,
  useAddXPReward as u,
  useServerXP as v,
  useServerXPRewards as w,
  useUnbanMember as x,
  useUnmuteMember as y,
  useUpdateChannel as z
};
