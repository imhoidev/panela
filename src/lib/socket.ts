// Client wrapper for the Socket.io realtime layer hosted on the backend.
// Set VITE_REALTIME_URL to your backend URL (e.g. https://panela-backend.onrender.com).
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string, token?: string): Socket {
  if (socket && socket.connected) return socket;
  const url = import.meta.env.VITE_REALTIME_URL || undefined;
  const auth = token ? { userId, token } : { userId };

  socket = io(url, {
    path: "/realtime",
    transports: ["websocket"],
    auth,
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
    timeout: 10000,
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

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
