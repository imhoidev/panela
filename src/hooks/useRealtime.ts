import { useCallback, useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { useAuth } from "@/hooks/use-auth";
import { disconnectSocket, getSocket } from "@/lib/socket";

export function useRealtimeSocket() {
  const { user, session } = useAuth();
  const [connected, setConnected] = useState(false);

  const socket = useMemo<Socket | null>(() => {
    if (!user) return null;
    return getSocket(user.id, session?.access_token ?? undefined);
  }, [user?.id, session?.access_token]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setConnected(socket.connected);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
    }
  }, [user]);

  const emit = useCallback((event: string, payload?: any) => {
    if (!socket) return;
    socket.emit(event, payload);
  }, [socket]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [socket]);

  return {
    socket,
    connected,
    emit,
    on,
  };
}

export function useSocketEvent<T = any>(event: string, handler: (payload: T) => void, deps: any[] = []) {
  const { socket } = useRealtimeSocket();

  useEffect(() => {
    if (!socket) return;
    const listener = (payload: T) => handler(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [socket, event, handler, ...deps]);
}

export function useSocketRoom(roomEvent: string, roomId: string | null, payload?: any) {
  const { socket } = useRealtimeSocket();

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit(roomEvent, payload ?? roomId);
    return () => {
      if (!socket) return;
      const leaveEvent = roomEvent.replace("join", "leave");
      socket.emit(leaveEvent, payload ?? roomId);
    };
  }, [socket, roomEvent, roomId, JSON.stringify(payload ?? roomId)]);
}
