// Client wrapper for the Socket.io realtime layer hosted on the backend.
// Set VITE_REALTIME_URL to your backend URL (e.g. https://panela-backend.onrender.com).
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(userId: string): Socket {
  if (socket && socket.connected) return socket;
  const url = import.meta.env.VITE_REALTIME_URL || undefined;
  socket = io(url, {
    path: "/realtime",
    transports: ["websocket"],
    auth: { userId },
    withCredentials: true,
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
