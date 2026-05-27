import { createFileRoute } from "@tanstack/react-router";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

/**
 * Emite um token LiveKit para a sala solicitada.
 * Requer: usuário autenticado (Bearer no Authorization).
 * Env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
 */
export const Route = createFileRoute("/api/livekit/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization") ?? "";
          const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : null;
          if (!token) return json({ error: "Missing bearer token" }, 401);

          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
          const LIVEKIT_URL = process.env.LIVEKIT_URL;
          const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
          const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
          if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
            return json({ error: "LiveKit não está configurado" }, 500);
          }

          const sb = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
          });
          const { data: userData, error: userErr } = await sb.auth.getUser();
          if (userErr || !userData.user) return json({ error: "Sessão inválida" }, 401);

          const body = (await request.json().catch(() => ({}))) as {
            room?: string;
            name?: string;
            channelId?: string;
          };
          if (!body.room || !/^[a-zA-Z0-9_:-]{1,128}$/.test(body.room)) {
            return json({ error: "room inválido" }, 400);
          }

          // Se canal informado, validar membership pela RLS
          if (body.channelId) {
            const { data: ch } = await sb
              .from("channels")
              .select("id, type")
              .eq("id", body.channelId)
              .maybeSingle();
            if (!ch || ch.type !== "voice") return json({ error: "Canal de voz não encontrado" }, 403);
          }

          // Username
          const { data: profile } = await sb
            .from("profiles")
            .select("username,display_name,avatar_url")
            .eq("id", userData.user.id)
            .maybeSingle();
          const identity = userData.user.id;
          const display = body.name || profile?.display_name || profile?.username || "panela";

          // LiveKit JWT (HS256). Claim "video" controla permissões.
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
            .setExpirationTime(now + 60 * 60 * 6) // 6h
            .setNotBefore(now - 5)
            .sign(secret);

          return json({ token: jwt, url: LIVEKIT_URL, identity, name: display });
        } catch (e: any) {
          console.error("livekit-token error", e);
          return json({ error: e?.message ?? "erro interno" }, 500);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
