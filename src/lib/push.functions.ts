import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

/** Retorna a chave pública VAPID para inscrição do navegador. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
});

/**
 * Envia push notification para todos os membros de um canal (exceto o autor).
 * Falha silenciosa em endpoints inválidos (limpa do banco).
 */
export const sendChannelPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    channelId: z.string().uuid(),
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(400),
    url: z.string().max(500).optional(),
    tag: z.string().max(120).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    const subj = process.env.VAPID_SUBJECT || "mailto:noreply@panela.app";
    if (!pub || !priv) return { sent: 0, error: "VAPID não configurado" };

    const { userId } = context;

    // Descobre server desse canal
    const { data: ch } = await supabaseAdmin.from("channels").select("server_id").eq("id", data.channelId).maybeSingle();
    if (!ch) return { sent: 0, error: "canal inexistente" };

    // Membros do server (exceto autor)
    const { data: members } = await supabaseAdmin
      .from("server_members").select("user_id").eq("server_id", ch.server_id);
    const recipientIds = (members ?? []).map((m: any) => m.user_id).filter((id: string) => id !== userId);
    if (recipientIds.length === 0) return { sent: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions").select("*").in("user_id", recipientIds);
    if (!subs || subs.length === 0) return { sent: 0 };

    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(subj, pub, priv);

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url ?? "/",
      tag: data.tag ?? `ch-${data.channelId}`,
    });

    const expired: string[] = [];
    let sent = 0;
    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) expired.push(s.endpoint);
        else console.warn("web-push fail", s.endpoint, e?.statusCode, e?.body);
      }
    }));

    if (expired.length) await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", expired);

    return { sent, expired: expired.length };
  });
