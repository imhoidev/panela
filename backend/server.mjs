import http from "node:http";
import crypto from "node:crypto";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";
import { Server as IOServer } from "socket.io";

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handleLiveKitToken(request) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
    if (!token) return json({ error: "Missing bearer token" }, 401);

    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return json({ error: "LiveKit não está configurado" }, 500);
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);

    const body = (await request.json().catch(() => ({})));
    if (!body.room || !/^[a-zA-Z0-9_:-]{1,128}$/.test(body.room)) {
      return json({ error: "room inválido" }, 400);
    }

    if (body.channelId) {
      const { data: ch } = await sb
        .from("channels")
        .select("id, type")
        .eq("id", body.channelId)
        .maybeSingle();
      if (!ch || ch.type !== "voice") return json({ error: "Canal de voz não encontrado" }, 403);
    }

    const { data: profile } = await sb
      .from("profiles")
      .select("username,display_name,avatar_url")
      .eq("id", userData.user.id)
      .maybeSingle();
    const identity = userData.user.id;
    const display = body.name || profile?.display_name || profile?.username || "panela";

    const now = Math.floor(Date.now() / 1000);
    const grants = {
      video: {
        room: body.room,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
      name: display,
      metadata: JSON.stringify({ avatar_url: profile?.avatar_url ?? null }),
    };

    const secret = new TextEncoder().encode(LIVEKIT_API_SECRET);
    const jwt = await new SignJWT(grants)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(LIVEKIT_API_KEY)
      .setSubject(identity)
      .setJti(crypto.randomUUID())
      .setIssuedAt(now)
      .setExpirationTime(now + 60 * 60 * 6)
      .setNotBefore(now - 5)
      .sign(secret);

    return json({ token: jwt, url: LIVEKIT_URL, identity, name: display });
  } catch (e) {
    console.error("livekit-token error", e);
    return json({ error: e?.message ?? "erro interno" }, 500);
  }
}

async function handleRequest(req, res) {
  const origin = req.headers["origin"] || "*";
  const headers = {
    "access-control-allow-origin": FRONTEND_ORIGIN === "*" ? origin : FRONTEND_ORIGIN,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-credentials": "true",
  };

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { ...headers, "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/livekit/token") {
    const body = await new Promise((resolve) => {
      let data = "";
      req.on("data", (chunk) => data += chunk);
      req.on("end", () => resolve(data));
    });
    const request = new Request(`http://localhost${url.pathname}`, {
      method: "POST",
      headers: { "content-type": req.headers["content-type"] || "", authorization: req.headers["authorization"] || "" },
      body,
    });
    const response = await handleLiveKitToken(request);
    res.writeHead(response.status, { ...headers, ...Object.fromEntries(response.headers) });
    res.end(await response.text());
    return;
  }

  res.writeHead(404, { ...headers, "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
}

const server = http.createServer(handleRequest);

const io = new IOServer(server, {
  path: "/realtime",
  cors: {
    origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN.split(","),
    credentials: true,
  },
});

const presence = new Map();

io.on("connection", (socket) => {
  const { userId } = socket.handshake.auth ?? {};
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  if (!presence.has(userId)) presence.set(userId, { sockets: new Set(), status: "online" });
  const entry = presence.get(userId);
  entry.sockets.add(socket.id);
  io.emit("presence:update", { userId, status: entry.status });

  socket.on("channel:join", (channelId) => {
    if (typeof channelId === "string") socket.join(`ch:${channelId}`);
  });
  socket.on("channel:leave", (channelId) => {
    if (typeof channelId === "string") socket.leave(`ch:${channelId}`);
  });

  socket.on("typing:start", ({ channelId, username }) => {
    if (!channelId) return;
    socket.to(`ch:${channelId}`).emit("typing:start", { userId, username });
  });
  socket.on("typing:stop", ({ channelId }) => {
    if (!channelId) return;
    socket.to(`ch:${channelId}`).emit("typing:stop", { userId });
  });

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
  console.log(`[panela-backend] API + Socket.io listening on :${PORT}`);
  console.log(`[panela-backend] FRONTEND_ORIGIN=${FRONTEND_ORIGIN}`);
});
