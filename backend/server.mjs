import http from "node:http";
import crypto from "node:crypto";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";
import { Server as IOServer } from "socket.io";
import webpush from "web-push";

const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:panela@panela.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const sbAdmin = SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : sb;

function getAuthedClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const rateLimitMap = new Map();
const RATE_WINDOW = 60_000;

function rateLimit(key, maxReqs) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) ?? { count: 0, resetAt: now + RATE_WINDOW };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_WINDOW; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count <= maxReqs;
}

function getBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => data += chunk);
    req.on("end", () => resolve(data));
  });
}

function json(data, status = 200, headers = {}) {
  return { status, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(data) };
}

function send(res, response) {
  const origin = res.req?.headers?.origin || "*";
  const cors = {
    "access-control-allow-origin": FRONTEND_ORIGIN === "*" ? origin : FRONTEND_ORIGIN,
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-credentials": "true",
  };
  res.writeHead(response.status, { ...cors, ...response.headers });
  res.end(response.body);
}

async function handleRequest(req, res) {
  res.req = req;

  if (req.method === "OPTIONS") {
    send(res, json(null, 204));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const rlKey = `${ip}:${url.pathname}`;

  if (url.pathname !== "/health" && !rateLimit(rlKey, 60)) {
    send(res, json({ error: "Muitas requisições. Tente de novo em instantes." }, 429));
    return;
  }

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      send(res, json({ ok: true, ts: Date.now(), uptime: process.uptime() }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/livekit/token") {
      const body = await getBody(req);
      const request = new Request(`http://localhost${url.pathname}`, {
        method: "POST",
        headers: { "content-type": req.headers["content-type"] || "", authorization: req.headers["authorization"] || "" },
        body,
      });
      const result = await handleLiveKitToken(request);
      send(res, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/push/subscribe") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u } } = await sb.auth.getUser(token);
      if (!u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = JSON.parse(await getBody(req));
      const sub = body.subscription || body;
      const endpoint = sub.endpoint;
      const p256dh = sub.keys?.p256dh || "";
      const authKey = sub.keys?.auth || "";
      if (!endpoint) { send(res, json({ error: "endpoint required" }, 400)); return; }
      const { error } = await sbAdmin.from("push_subscriptions").upsert({
        user_id: u.id, endpoint, p256dh, auth: authKey, user_agent: req.headers["user-agent"] || null,
      }, { onConflict: "user_id,endpoint" });
      if (error) { send(res, json({ error: error.message }, 500)); return; }
      send(res, json({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/push/unsubscribe") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u } } = await sb.auth.getUser(token);
      if (!u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = JSON.parse(await getBody(req));
      if (!body.endpoint) { send(res, json({ error: "endpoint required" }, 400)); return; }
      const { error } = await sbAdmin.from("push_subscriptions").delete().eq("endpoint", body.endpoint).eq("user_id", u.id);
      if (error) { send(res, json({ error: error.message }, 500)); return; }
      send(res, json({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/push/test") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u } } = await sb.auth.getUser(token);
      if (!u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const { data: subs } = await sbAdmin.from("push_subscriptions").select("*").eq("user_id", u.id);
      if (!subs?.length) { send(res, json({ error: "Nenhuma inscrição encontrada" }, 404)); return; }
      const results = [];
      for (const sub of subs) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth },
          }, JSON.stringify({ title: "🔔 PANELA", body: "Notificação de teste! Funciona 🎉", icon: "/icon.png", data: { url: "/app" } }));
          results.push({ endpoint: sub.endpoint, ok: true });
        } catch (e) {
          if (e.statusCode === 410) await sbAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          results.push({ endpoint: sub.endpoint, ok: false, error: e.message });
        }
      }
      send(res, json({ results }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/search/messages") {
      const q = url.searchParams.get("q");
      const serverId = url.searchParams.get("server_id");
      const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
      const before = url.searchParams.get("before");
      if (!q || !serverId) { send(res, json({ error: "q and server_id required" }, 400)); return; }
      const { data: channels } = await sb.from("channels").select("id").eq("server_id", serverId);
      if (!channels?.length) { send(res, json([])); return; }
      const channelIds = channels.map((c) => c.id);
      let query = sb.from("messages").select("id,content,created_at,author_id,channel_id").in("channel_id", channelIds).ilike("content", `%${q}%`).order("created_at", { ascending: false }).limit(limit);
      if (before) query = query.lt("created_at", before);
      const { data } = await query;
      const userIds = [...new Set((data ?? []).map((m) => m.author_id))];
      if (userIds.length) {
        const { data: profs } = await sb.from("profiles").select("id,username,display_name,avatar_url").in("id", userIds);
        const profMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
        for (const m of data ?? []) m.author = profMap[m.author_id] || null;
      }
      send(res, json(data ?? []));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/upload-dm") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u }, error: ue } = await sb.auth.getUser(token);
      if (ue || !u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = await getBody(req);
      const ct = req.headers["content-type"] || "";
      if (!ct.includes("multipart/form-data")) { send(res, json({ error: "Expected multipart/form-data" }, 400)); return; }
      const boundary = ct.split("boundary=")[1];
      const parts = parseMultipart(body, boundary);
      const filePart = parts.find((p) => p.name === "file");
      const conversationId = parts.find((p) => p.name === "conversation_id")?.value;
      if (!filePart || !conversationId) { send(res, json({ error: "file and conversation_id required" }, 400)); return; }
      const bucket = "attachments";
      const path = `${u.id}/dm/${Date.now()}-${filePart.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const sbAuth = getAuthedClient(token);
      const { error: upErr } = await sbAdmin.storage.from(bucket).upload(path, Buffer.from(filePart.data, "binary"), { contentType: filePart.contentType, upsert: false });
      if (upErr) { send(res, json({ error: upErr.message }, 500)); return; }
      const { data: pub } = sbAdmin.storage.from(bucket).getPublicUrl(path);
      const { data: msg, error: msgErr } = await sbAuth.from("dm_messages").insert({
        conversation_id: conversationId, author_id: u.id, content: null,
        attachment_url: pub.publicUrl, attachment_type: filePart.contentType,
      }).select("id").single();
      if (msgErr) { send(res, json({ error: msgErr.message }, 500)); return; }
      send(res, json({ id: msg.id, url: pub.publicUrl }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/upload") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u }, error: ue } = await sb.auth.getUser(token);
      if (ue || !u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = await getBody(req);
      const ct = req.headers["content-type"] || "";
      if (!ct.includes("multipart/form-data")) { send(res, json({ error: "Expected multipart/form-data" }, 400)); return; }

      const boundary = ct.split("boundary=")[1];
      const parts = parseMultipart(body, boundary);
      const filePart = parts.find((p) => p.name === "file");
      const channelId = parts.find((p) => p.name === "channel_id")?.value;
      if (!filePart || !channelId) { send(res, json({ error: "file and channel_id required" }, 400)); return; }

      const bucket = "attachments";
      const path = `${u.id}/${Date.now()}-${filePart.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const sbAuth = getAuthedClient(token);
      const { error: upErr } = await sbAuth.storage.from(bucket).upload(path, Buffer.from(filePart.data, "binary"), { contentType: filePart.contentType, upsert: false });
      if (upErr) { send(res, json({ error: upErr.message }, 500)); return; }
      const { data: pub } = sbAuth.storage.from(bucket).getPublicUrl(path);
      const { data: msg, error: msgErr } = await sbAuth.from("messages").insert({ channel_id: channelId, author_id: u.id, content: null, attachment_url: pub.publicUrl, attachment_type: filePart.contentType }).select("id").single();
      if (msgErr) { send(res, json({ error: msgErr.message }, 500)); return; }

      send(res, json({ id: msg.id, url: pub.publicUrl }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/upload-server-icon") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u }, error: ue } = await sb.auth.getUser(token);
      if (ue || !u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = await getBody(req);
      const ct = req.headers["content-type"] || "";
      if (!ct.includes("multipart/form-data")) { send(res, json({ error: "Expected multipart/form-data" }, 400)); return; }
      const boundary = ct.split("boundary=")[1];
      const parts = parseMultipart(body, boundary);
      const filePart = parts.find((p) => p.name === "file");
      const serverId = parts.find((p) => p.name === "server_id")?.value;
      if (!filePart || !serverId) { send(res, json({ error: "file and server_id required" }, 400)); return; }
      const { data: member } = await sbAdmin.from("server_members").select("level").eq("server_id", serverId).eq("user_id", u.id).maybeSingle();
      if (!member || member.level < 80) { send(res, json({ error: "Sem permissão" }, 403)); return; }
      const bucket = "server-icons";
      const path = `servers/${serverId}/${Date.now()}-${filePart.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await sbAdmin.storage.from(bucket).upload(path, Buffer.from(filePart.data, "binary"), { contentType: filePart.contentType, upsert: true });
      if (upErr) { send(res, json({ error: upErr.message }, 500)); return; }
      const { data: pub } = sbAdmin.storage.from(bucket).getPublicUrl(path);
      send(res, json({ url: pub.publicUrl }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/channels/reorder") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u }, error: ue } = await sb.auth.getUser(token);
      if (ue || !u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = JSON.parse(await getBody(req));
      const items = Array.isArray(body) ? body : body.items;
      if (!Array.isArray(items) || items.length === 0) { send(res, json({ error: "items required" }, 400)); return; }
      const ids = items.map((i) => i.id).filter(Boolean);
      const { data: channels } = await sbAdmin.from("channels").select("id,server_id").in("id", ids);
      if (!channels || channels.length !== ids.length) { send(res, json({ error: "channels not found" }, 404)); return; }
      const serverId = channels[0].server_id;
      if (!channels.every((c) => c.server_id === serverId)) { send(res, json({ error: "channels must belong to same server" }, 400)); return; }
      const { data: member } = await sbAdmin.from("server_members").select("level").eq("server_id", serverId).eq("user_id", u.id).maybeSingle();
      if (!member || member.level < 80) { send(res, json({ error: "Sem permissão" }, 403)); return; }
      const toUpsert = items.map((it) => ({ id: it.id, position: it.position ?? null, category: it.category ?? null }));
      const { error: upErr } = await sbAdmin.from("channels").upsert(toUpsert, { onConflict: "id" });
      if (upErr) { send(res, json({ error: upErr.message }, 500)); return; }
      send(res, json({ ok: true }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/upload-server-banner") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u }, error: ue } = await sb.auth.getUser(token);
      if (ue || !u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = await getBody(req);
      const ct = req.headers["content-type"] || "";
      if (!ct.includes("multipart/form-data")) { send(res, json({ error: "Expected multipart/form-data" }, 400)); return; }
      const boundary = ct.split("boundary=")[1];
      const parts = parseMultipart(body, boundary);
      const filePart = parts.find((p) => p.name === "file");
      const serverId = parts.find((p) => p.name === "server_id")?.value;
      if (!filePart || !serverId) { send(res, json({ error: "file and server_id required" }, 400)); return; }
      const { data: member } = await sbAdmin.from("server_members").select("level").eq("server_id", serverId).eq("user_id", u.id).maybeSingle();
      if (!member || member.level < 80) { send(res, json({ error: "Sem permissão" }, 403)); return; }
      const bucket = "server-banners";
      const path = `servers/${serverId}/banner-${Date.now()}-${filePart.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await sbAdmin.storage.from(bucket).upload(path, Buffer.from(filePart.data, "binary"), { contentType: filePart.contentType, upsert: true });
      if (upErr) { send(res, json({ error: upErr.message }, 500)); return; }
      const { data: pub } = sbAdmin.storage.from(bucket).getPublicUrl(path);
      send(res, json({ url: pub.publicUrl }));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/upload-sticker") {
      const auth = req.headers["authorization"] || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (!token) { send(res, json({ error: "Unauthorized" }, 401)); return; }
      const { data: { user: u }, error: ue } = await sb.auth.getUser(token);
      if (ue || !u) { send(res, json({ error: "Invalid token" }, 401)); return; }
      const body = await getBody(req);
      const ct = req.headers["content-type"] || "";
      if (!ct.includes("multipart/form-data")) { send(res, json({ error: "Expected multipart/form-data" }, 400)); return; }
      const boundary = ct.split("boundary=")[1];
      const parts = parseMultipart(body, boundary);
      const filePart = parts.find((p) => p.name === "file");
      const packId = parts.find((p) => p.name === "sticker_pack_id")?.value;
      if (!filePart || !packId) { send(res, json({ error: "file and sticker_pack_id required" }, 400)); return; }
      const { data: pack } = await sbAdmin.from("sticker_packs").select("owner_id, server_id").eq("id", packId).maybeSingle();
      if (!pack) { send(res, json({ error: "Pack not found" }, 404)); return; }
      if (pack.owner_id !== u.id) {
        const { data: member } = await sbAdmin.from("server_members").select("level").eq("server_id", pack.server_id).eq("user_id", u.id).maybeSingle();
        if (!member || member.level < 80) { send(res, json({ error: "Sem permissão" }, 403)); return; }
      }
      const bucket = "stickers";
      const path = `${packId}/${Date.now()}-${filePart.filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: upErr } = await sbAdmin.storage.from(bucket).upload(path, Buffer.from(filePart.data, "binary"), { contentType: filePart.contentType, upsert: true });
      if (upErr) { send(res, json({ error: upErr.message }, 500)); return; }
      const { data: pub } = sbAdmin.storage.from(bucket).getPublicUrl(path);
      send(res, json({ url: pub.publicUrl }));
      return;
    }

    send(res, json({ error: "not found" }, 404));
  } catch (e) {
    console.error("request error", url.pathname, e);
    send(res, json({ error: "Erro interno" }, 500));
  }
}

function parseMultipart(body, boundary) {
  const parts = [];
  const lines = body.split(`--${boundary}`);
  for (const block of lines) {
    if (block.includes("filename=")) {
      const headerMatch = block.match(/name="([^"]+)"\s*;\s*filename="([^"]+)"/);
      const contentTypeMatch = block.match(/Content-Type:\s*(\S+)/);
      const dataStart = block.indexOf("\r\n\r\n") + 4;
      const dataEnd = block.lastIndexOf("\r\n--");
      const data = block.slice(dataStart, dataEnd > dataStart ? dataEnd : undefined);
      if (headerMatch) parts.push({ name: headerMatch[1], filename: headerMatch[2], contentType: contentTypeMatch?.[1] || "application/octet-stream", data });
    } else {
      const match = block.match(/name="([^"]+)"\r\n\r\n(.+?)\r\n/);
      if (match) parts.push({ name: match[1], value: match[2].trim() });
    }
  }
  return parts;
}

const server = http.createServer(handleRequest);

async function handleLiveKitToken(request) {
  try {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
    if (!token) return json({ error: "Missing bearer token" }, 401);
    if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) return json({ error: "LiveKit não está configurado" }, 500);
    const lkSb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await lkSb.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);
    const body = (await request.json().catch(() => ({})));
    if (!body.room || !/^[a-zA-Z0-9_:-]{1,128}$/.test(body.room)) return json({ error: "room inválido" }, 400);
    if (body.channelId) {
      const { data: ch } = await lkSb.from("channels").select("id, type").eq("id", body.channelId).maybeSingle();
      if (!ch || ch.type !== "voice") return json({ error: "Canal de voz não encontrado" }, 403);
    }
    const { data: profile } = await lkSb.from("profiles").select("username,display_name,avatar_url").eq("id", userData.user.id).maybeSingle();
    const identity = userData.user.id;
    const display = body.name || profile?.display_name || profile?.username || "panela";
    const now = Math.floor(Date.now() / 1000);
    const grants = { video: { room: body.room, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true }, name: display, metadata: JSON.stringify({ avatar_url: profile?.avatar_url ?? null }) };
    const secret = new TextEncoder().encode(LIVEKIT_API_SECRET);
    const jwt = await new SignJWT(grants).setProtectedHeader({ alg: "HS256" }).setIssuer(LIVEKIT_API_KEY).setSubject(identity).setJti(crypto.randomUUID()).setIssuedAt(now).setExpirationTime(now + 60 * 60 * 6).setNotBefore(now - 5).sign(secret);
    return json({ token: jwt, url: LIVEKIT_URL, identity, name: display });
  } catch (e) {
    console.error("livekit-token error", e);
    return json({ error: e?.message ?? "erro interno" }, 500);
  }
}

const io = new IOServer(server, {
  path: "/realtime",
  cors: { origin: FRONTEND_ORIGIN === "*" ? true : FRONTEND_ORIGIN.split(","), credentials: true },
});

const presence = new Map();        // userId -> { sockets: Set<socketId>, status, serverId }
const userStatus = new Map();      // userId -> "online" | "idle" | "dnd" | "offline"
const roomPresence = new Map();    // serverId -> Map<userId, status>

io.on("connection", async (socket) => {
  const auth = socket.handshake.auth ?? {};
  const token = typeof auth.token === "string" ? auth.token : null;
  const claimedUserId = typeof auth.userId === "string" ? auth.userId : null;

  if (!token) {
    socket.disconnect(true);
    return;
  }

  const { data: userData, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userData.user) {
    socket.disconnect(true);
    return;
  }

  const userId = userData.user.id;
  if (claimedUserId && claimedUserId !== userId) {
    console.warn(`[socket] claimed userId ${claimedUserId} does not match token user ${userId}`);
  }

  socket.data.userId = userId;

  if (!presence.has(userId)) presence.set(userId, { sockets: new Set(), status: "online", serverId: null });
  const entry = presence.get(userId);
  entry.sockets.add(socket.id);
  userStatus.set(userId, entry.status);
  io.emit("presence:update", { userId, status: entry.status });

  // === PRESENCE:JOIN — join a server room with optional status ===
  socket.on("presence:join", ({ serverId, status }) => {
    const uid = socket.data.userId;
    const s = ["online", "idle", "dnd", "invisible"].includes(status) ? status : "online";
    entry.status = s;
    userStatus.set(uid, s);

    if (entry.serverId) {
      socket.leave(`srv:${entry.serverId}`);
      const prevRoom = roomPresence.get(entry.serverId);
      if (prevRoom) { prevRoom.delete(uid); if (prevRoom.size === 0) roomPresence.delete(entry.serverId); }
    }

    entry.serverId = typeof serverId === "string" ? serverId : null;
    if (entry.serverId) {
      socket.join(`srv:${entry.serverId}`);
      if (!roomPresence.has(entry.serverId)) roomPresence.set(entry.serverId, new Map());
      roomPresence.get(entry.serverId).set(uid, s);
      const users = Array.from(roomPresence.get(entry.serverId).entries()).map(([id, st]) => ({ userId: id, status: st }));
      io.to(`srv:${entry.serverId}`).emit("presence:users", users);
    }
  });

  socket.on("channel:join", (channelId) => { if (typeof channelId === "string") socket.join(`ch:${channelId}`); });
  socket.on("channel:leave", (channelId) => { if (typeof channelId === "string") socket.leave(`ch:${channelId}`); });
  socket.on("typing:start", ({ channelId, username }) => { if (!channelId) return; socket.to(`ch:${channelId}`).emit("typing:start", { userId, username }); });
  socket.on("typing:stop", ({ channelId }) => { if (!channelId) return; socket.to(`ch:${channelId}`).emit("typing:stop", { userId }); });

  socket.on("dm:join", (conversationId) => { if (typeof conversationId === "string") socket.join(`dm:${conversationId}`); });
  socket.on("dm:leave", (conversationId) => { if (typeof conversationId === "string") socket.leave(`dm:${conversationId}`); });
  socket.on("dm:typing:start", ({ conversationId, username }) => { if (!conversationId) return; socket.to(`dm:${conversationId}`).emit("typing:start", { userId, username }); });
  socket.on("dm:typing:stop", ({ conversationId }) => { if (!conversationId) return; socket.to(`dm:${conversationId}`).emit("typing:stop", { userId }); });

  socket.on("message:new", ({ channelId, conversationId, message }) => {
    if (channelId) socket.to(`ch:${channelId}`).emit("message:new", message);
    if (conversationId) socket.to(`dm:${conversationId}`).emit("message:new", message);
  });
  socket.on("message:deleted", ({ channelId, conversationId, messageId }) => {
    if (channelId) socket.to(`ch:${channelId}`).emit("message:deleted", { messageId });
    if (conversationId) socket.to(`dm:${conversationId}`).emit("message:deleted", { messageId });
  });
  socket.on("message:updated", ({ channelId, conversationId, message }) => {
    if (channelId) socket.to(`ch:${channelId}`).emit("message:updated", message);
    if (conversationId) socket.to(`dm:${conversationId}`).emit("message:updated", message);
  });

  socket.on("presence:set", (status) => {
    if (!["online", "idle", "dnd", "invisible"].includes(status)) return;
    const uid = socket.data.userId;
    entry.status = status;
    userStatus.set(uid, status);
    if (entry.serverId && roomPresence.has(entry.serverId)) {
      roomPresence.get(entry.serverId).set(uid, status);
      const users = Array.from(roomPresence.get(entry.serverId).entries()).map(([id, st]) => ({ userId: id, status: st }));
      io.to(`srv:${entry.serverId}`).emit("presence:users", users);
    }
    io.emit("presence:update", { userId: uid, status });
  });

  socket.on("presence:subscribe", (userIds) => {
    if (!Array.isArray(userIds)) return;
    const statuses = {};
    for (const uid of userIds) {
      if (typeof uid !== "string") continue;
      statuses[uid] = userStatus.get(uid) || "offline";
    }
    socket.emit("presence:bulk", statuses);
  });

  socket.on("disconnect", () => {
    const uid = socket.data.userId;
    entry.sockets.delete(socket.id);
    if (entry.sockets.size === 0) {
      if (entry.serverId && roomPresence.has(entry.serverId)) {
        roomPresence.get(entry.serverId).delete(uid);
        const users = Array.from(roomPresence.get(entry.serverId).entries()).map(([id, st]) => ({ userId: id, status: st }));
        io.to(`srv:${entry.serverId}`).emit("presence:users", users);
      }
      presence.delete(uid);
      userStatus.delete(uid);
      io.emit("presence:update", { userId: uid, status: "offline" });
    }
  });
});

async function sendPushForMessage(msg) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  if (!msg.content && !msg.attachment_url) return;
  try {
    const { data: ch } = await sbAdmin.from("channels").select("server_id, name").eq("id", msg.channel_id).maybeSingle();
    if (!ch) return;
    const { data: members } = await sbAdmin.from("server_members").select("user_id").eq("server_id", ch.server_id);
    if (!members?.length) return;
    const { data: author } = await sbAdmin.from("profiles").select("username, display_name").eq("id", msg.author_id).maybeSingle();
    const authorName = author?.display_name || author?.username || "Alguém";
    const preview = msg.attachment_url ? "[Arquivo]" : (msg.content?.slice(0, 120) || "");
    const targets = members.filter((m) => m.user_id !== msg.author_id).map((m) => m.user_id);
    if (!targets.length) return;
    const { data: subs } = await sbAdmin.from("push_subscriptions").select("*").in("user_id", targets);
    if (!subs?.length) return;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint, keys: { p256dh: sub.p256dh || "", auth: sub.auth || "" },
        }, JSON.stringify({
          title: `#${ch.name} · ${authorName}`,
          body: preview, icon: "/icon.png", badge: "/icon.png",
          data: { url: `/app/servers/${msg.channel_id}` },
          tag: `ch:${msg.channel_id}`, vibrate: [100, 50, 100],
        }));
      } catch (e) {
        if (e.statusCode === 410) await sbAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      }
    }
  } catch (e) {
    console.error("[push-send] error:", e.message);
  }
}

if (SUPABASE_SERVICE_ROLE_KEY) {
  sbAdmin.channel("push-watch")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
      sendPushForMessage(payload.new);
    })
    .subscribe();
  console.log("[panela-backend] Push notification listener active");
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[panela-backend] API + Socket.io listening on :${PORT}`);
});
