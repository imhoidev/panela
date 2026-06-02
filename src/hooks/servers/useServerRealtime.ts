import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSocket } from "@/hooks/useRealtime";

export function useServerRealtime(serverId: string) {
  const qc = useQueryClient();
  const { socket, connected } = useRealtimeSocket();
  const joinRef = useRef(false);

  useEffect(() => {
    if (!serverId || !socket) return;
    if (joinRef.current) return;
    const joinServer = () => {
      socket.emit("presence:join", { serverId, status: "online" });
      joinRef.current = true;
    };
    if (socket.connected) joinServer();
    socket.on("connect", joinServer);
    return () => {
      socket.off("connect", joinServer);
      if (socket.connected) socket.emit("presence:join", { serverId: null, status: "offline" });
      joinRef.current = false;
    };
  }, [serverId, socket]);

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
  const { socket, connected } = useRealtimeSocket();
  const lastMap = useRef<Map<string, string>>(new Map());

  const handleUsers = useCallback((users: Array<{ userId: string; status: string }>) => {
    const map = new Map<string, string>();
    users.forEach((user) => map.set(user.userId, user.status || "offline"));
    lastMap.current = map;
    onPresence(map);
  }, [onPresence]);

  useEffect(() => {
    if (!serverId || !userId) return;

    if (socket) {
      const joinServer = () => {
        socket.emit("presence:join", { serverId, status: "online" });
      };
      const onPresenceUpdate = ({ userId: uid, status }: { userId: string; status: string }) => {
        const updated = new Map(lastMap.current);
        updated.set(uid, status || "offline");
        lastMap.current = updated;
        onPresence(updated);
      };

      socket.on("presence:users", handleUsers);
      socket.on("presence:update", onPresenceUpdate);
      socket.on("connect", joinServer);
      if (socket.connected) joinServer();

      return () => {
        socket.off("presence:users", handleUsers);
        socket.off("presence:update", onPresenceUpdate);
        socket.off("connect", joinServer);
        if (socket.connected) socket.emit("presence:join", { serverId: null, status: "offline" });
      };
    }

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
  }, [serverId, userId, socket, connected, handleUsers, onPresence]);
}
