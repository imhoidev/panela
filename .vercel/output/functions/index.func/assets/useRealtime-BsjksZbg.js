import { useState, useMemo, useEffect, useCallback } from "react";
import { u as useAuth } from "./router-BokS3urV.js";
import { io } from "socket.io-client";
let socket = null;
function getSocket(userId, token) {
  if (socket && socket.connected) return socket;
  const url = void 0;
  const auth = token ? { userId, token } : { userId };
  socket = io(url, {
    path: "/realtime",
    transports: ["websocket"],
    auth,
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5e3,
    timeout: 1e4
  });
  socket.on("connect_error", (error) => {
    console.warn("[socket] connect_error", error?.message || error);
  });
  socket.on("reconnect_failed", () => {
    console.warn("[socket] reconnect failed");
  });
  socket.on("reconnect", (attempt) => {
    console.info(`[socket] reconnected after ${attempt} attempts`);
  });
  return socket;
}
function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
function useRealtimeSocket() {
  const { user, session } = useAuth();
  const [connected, setConnected] = useState(false);
  const socket2 = useMemo(() => {
    if (!user) return null;
    return getSocket(user.id, session?.access_token ?? void 0);
  }, [user?.id, session?.access_token]);
  useEffect(() => {
    if (!socket2) return;
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket2.on("connect", onConnect);
    socket2.on("disconnect", onDisconnect);
    setConnected(socket2.connected);
    return () => {
      socket2.off("connect", onConnect);
      socket2.off("disconnect", onDisconnect);
    };
  }, [socket2]);
  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setConnected(false);
    }
  }, [user]);
  const emit = useCallback((event, payload) => {
    if (!socket2) return;
    socket2.emit(event, payload);
  }, [socket2]);
  const on = useCallback((event, handler) => {
    if (!socket2) return;
    socket2.on(event, handler);
    return () => {
      socket2.off(event, handler);
    };
  }, [socket2]);
  return {
    socket: socket2,
    connected,
    emit,
    on
  };
}
export {
  useRealtimeSocket as u
};
