import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useServerRealtime(serverId: string) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!serverId) return;

    const channel = supabase.channel(`server-realtime-${serverId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}`,
      }, () => qc.invalidateQueries({ queryKey: ["channels", serverId] }))
      .on("postgres_changes", {
        event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}`,
      }, () => {
        qc.invalidateQueries({ queryKey: ["members", serverId] });
        qc.invalidateQueries({ queryKey: ["server", serverId] });
      })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "server_roles", filter: `server_id=eq.${serverId}`,
      }, () => qc.invalidateQueries({ queryKey: ["roles", serverId] }))
      .on("postgres_changes", {
        event: "*", schema: "public", table: "server_member_roles",
      }, () => qc.invalidateQueries({ queryKey: ["memberRoleMap", serverId] }))
      .on("postgres_changes", {
        event: "*", schema: "public", table: "server_bans", filter: `server_id=eq.${serverId}`,
      }, () => qc.invalidateQueries({ queryKey: ["bans", serverId] }))
      .on("postgres_changes", {
        event: "*", schema: "public", table: "server_mutes", filter: `server_id=eq.${serverId}`,
      }, () => qc.invalidateQueries({ queryKey: ["mutes", serverId] }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [serverId, qc]);
}

export function usePresenceChannel(serverId: string, userId: string | undefined, onPresence: (map: Map<string, string>) => void) {
  useEffect(() => {
    if (!serverId || !userId) return;
    const chan = supabase.channel(`presence:${serverId}`, {
      config: { presence: { key: userId } },
    });
    chan.on("presence", { event: "sync" }, () => {
      const state = chan.presenceState();
      const m = new Map<string, string>();
      Object.entries(state).forEach(([uid, infos]: [string, any]) => {
        m.set(uid, infos?.[0]?.status || "online");
      });
      onPresence(m);
    });
    chan.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await chan.track({ user_id: userId, status: "online", server_id: serverId });
      }
    });
    return () => { supabase.removeChannel(chan); };
  }, [serverId, userId, onPresence]);
}
