import "@livekit/components-styles";
import { useEffect, useState } from "react";
import {
  LiveKitRoom, GridLayout, ParticipantTile, useTracks, RoomAudioRenderer, ControlBar,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PhoneOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      const r = await fetch("/api/livekit/token", {
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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/15 grid place-items-center text-primary">
          <Phone className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">Canal de voz</p>
          <p className="text-sm text-muted-foreground">Entre pra falar com a galera em tempo real.</p>
        </div>
        <Button onClick={join} disabled={loading} size="lg">
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
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
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-auto p-2">
          <Stage />
        </div>
        <div className="border-t border-border bg-card/40 p-2 flex items-center justify-between gap-2 pb-safe">
          <ControlBar
            variation="minimal"
            controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }}
          />
          <Button variant="destructive" size="sm" onClick={() => { setJoined(false); setToken(null); }}>
            <PhoneOff className="h-4 w-4 mr-1.5" /> Sair
          </Button>
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
