import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useServerDetails(serverId: string) {
  return useQuery({
    queryKey: ["server", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("servers").select("*").eq("id", serverId).maybeSingle();
      return data;
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

export function useServerChannels(serverId: string) {
  return useQuery({
    queryKey: ["channels", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("*").eq("server_id", serverId).order("position");
      return data ?? [];
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

export function useServerMembers(serverId: string) {
  return useQuery({
    queryKey: ["members", serverId],
    queryFn: async () => {
      const { data: mems } = await supabase
        .from("server_members")
        .select("id, user_id, level, xp, joined_at")
        .eq("server_id", serverId);
      if (!mems?.length) return [];
      const userIds = mems.map((m: any) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, name_color, name_colors, name_effect, current_plan, status_text")
        .in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      return mems.map((m: any) => ({ ...m, profiles: profMap[m.user_id] || null }));
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

export function useServerRoles(serverId: string) {
  return useQuery({
    queryKey: ["roles", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_roles").select("*").eq("server_id", serverId).order("level", { ascending: false });
      return data ?? [];
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

export function useMemberLevel(serverId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["memberLevel", serverId, userId],
    queryFn: async () => {
      if (!userId) return 0;
      const { data } = await supabase
        .from("server_members")
        .select("level")
        .eq("server_id", serverId)
        .eq("user_id", userId)
        .maybeSingle();
      return data?.level ?? 0;
    },
    enabled: !!serverId && !!userId,
    staleTime: 60_000,
  });
}

export function useServerBans(serverId: string) {
  return useQuery({
    queryKey: ["bans", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_bans").select("*").eq("server_id", serverId);
      const list = data ?? [];
      if (!list.length) return [];
      const userIds = list.map((b: any) => b.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      return list.map((b: any) => ({ ...b, profiles: profMap[b.user_id] || null }));
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

export function useServerMutes(serverId: string) {
  return useQuery({
    queryKey: ["mutes", serverId],
    queryFn: async () => {
      const { data } = await supabase.from("server_mutes").select("*").eq("server_id", serverId);
      const list = data ?? [];
      if (!list.length) return [];
      const userIds = list.map((m: any) => m.user_id);
      const { data: profs } = await supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", userIds);
      const profMap = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
      return list.map((m: any) => ({ ...m, profiles: profMap[m.user_id] || null }));
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}

export function useMemberRoleMap(serverId: string) {
  return useQuery({
    queryKey: ["memberRoleMap", serverId],
    queryFn: async () => {
      const map = new Map<string, string[]>();
      const { data } = await supabase
        .from("server_member_roles")
        .select("member_id, role_id, server_members!inner(user_id)")
        .eq("server_members.server_id", serverId);
      (data ?? []).forEach((mr: any) => {
        const uid = mr.server_members?.user_id;
        if (!uid) return;
        const ids = map.get(uid) ?? [];
        ids.push(mr.role_id);
        map.set(uid, ids);
      });
      return map;
    },
    enabled: !!serverId,
    staleTime: 30_000,
  });
}
