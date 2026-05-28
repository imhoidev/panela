import "@livekit/components-styles";
import { useEffect, useState } from "react";
import {
  LiveKitRoom, GridLayout, ParticipantTile, useTracks, RoomAudioRenderer, ControlBar,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PhoneOff, Phone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "";

type TokenRes = { token: string; url: string; identity: string; name: string };

export function VoiceRoom({
  room, channelId, name, defaultJoined,
}: { room: string; channelId?: string; name?: string; defaultJoined?: boolean }) {
  const [token, setToken] = useState<TokenRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(!!defaultJoined);

  async function join() {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const bearer = sess.session?.access_token;
      if (!bearer) throw new Error("Sem sessão");
      const r = await fetch(`${API_URL}/api/livekit/token`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${bearer}` },
        body: JSON.stringify({ room, channelId, name }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Falha ao gerar token");
      setToken(j);
      setJoined(true);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao entrar na sala");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (defaultJoined && !token && !loading) join();
    // eslint-disable-next-line
  }, [defaultJoined]);

  if (!joined || !token) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 grid place-items-center text-primary">
            <Phone className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-1.5 max-w-sm">
          <p className="text-xl font-semibold">Canal de voz</p>
          <p className="text-sm text-muted-foreground">Entre pra falar com a galera em tempo real. Microfone, câmera e tela.</p>
        </div>
        <Button onClick={join} disabled={loading} size="lg" className="min-w-[180px] h-11">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Entrar na sala
        </Button>
      </div>
    );
  }

  return (
    <LiveKitRoom
      data-lk-theme="default"
      token={token.token}
      serverUrl={token.url}
      audio={true}
      video={false}
      connect={true}
      onDisconnected={() => { setJoined(false); setToken(null); }}
      className="h-full"
    >
      <div className="flex flex-col h-full bg-gradient-to-b from-background to-card/40">
        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">
          <Stage />
        </div>
        <div className="border-t border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 sm:px-5 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start">
              <div className="voice-controls flex items-center gap-2 sm:gap-3 rounded-full bg-background/60 border border-border px-2 sm:px-3 py-1.5">
                <ControlBar
                  variation="minimal"
                  controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
                />
              </div>
            </div>
            <Button
              variant="destructive"
              size="lg"
              className="h-11 rounded-full px-5 shrink-0"
              onClick={() => { setJoined(false); setToken(null); }}
            >
              <PhoneOff className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} style={{ height: "100%" }}>
      <ParticipantTile />
    </GridLayout>
  );
}
