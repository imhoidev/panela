// Custom Node entry for Render deployment.
// Wraps the Nitro `node-server` build output and attaches a Socket.io
// server on the same HTTP port for realtime presence + typing indicators.
//
// Build with:  NITRO_PRESET=node-server npm run build
// Start with:  node server.node.mjs
import http from "node:http";
import { Server as IOServer } from "socket.io";

// Nitro's node-server preset emits a request listener at .output/server/index.mjs.
// We import it dynamically so the file can sit at the repo root.
const nitroEntry = await import("../.output/server/index.mjs");
const nitroHandler =
  nitroEntry.handler ?? nitroEntry.default?.handler ?? nitroEntry.default;

if (typeof nitroHandler !== "function") {
  throw new Error(
    "Could not resolve Nitro request handler from .output/server/index.mjs",
  );
}

const PORT = Number(process.env.PORT) || 10000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

const server = http.createServer((req, res) => {
  // Lightweight healthcheck for Render
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }
  return nitroHandler(req, res);
});

// ---- Socket.io: presence + typing ----
const io = new IOServer(server, {
  path: "/realtime",
  cors: {
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN.split(","),
    credentials: true,
  },
});

// In-memory presence map: userId -> { socketIds: Set, status }
const presence = new Map();

io.on("connection", (socket) => {
  const { userId } = socket.handshake.auth ?? {};
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  // Track presence
  if (!presence.has(userId)) presence.set(userId, { sockets: new Set(), status: "online" });
  const entry = presence.get(userId);
  entry.sockets.add(socket.id);
  io.emit("presence:update", { userId, status: entry.status });

  // Join channel rooms (for typing/scoped broadcasts)
  socket.on("channel:join", (channelId) => {
    if (typeof channelId === "string") socket.join(`ch:${channelId}`);
  });
  socket.on("channel:leave", (channelId) => {
    if (typeof channelId === "string") socket.leave(`ch:${channelId}`);
  });

  // Typing indicators
  socket.on("typing:start", ({ channelId, username }) => {
    if (!channelId) return;
    socket.to(`ch:${channelId}`).emit("typing:start", { userId, username });
  });
  socket.on("typing:stop", ({ channelId }) => {
    if (!channelId) return;
    socket.to(`ch:${channelId}`).emit("typing:stop", { userId });
  });

  // Custom status (online / idle / dnd)
  socket.on("presence:set", (status) => {
    if (!["online", "idle", "dnd", "invisible"].includes(status)) return;
    entry.status = status;
    io.emit("presence:update", { userId, status });
  });

  socket.on("disconnect", () => {
    entry.sockets.delete(socket.id);
    if (entry.sockets.size === 0) {
      presence.delete(userId);
      io.emit("presence:update", { userId, status: "offline" });
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[panela] HTTP + Socket.io listening on :${PORT}`);
  console.log(`[panela] FRONTEND_ORIGIN=${FRONTEND_ORIGIN}`);
});
