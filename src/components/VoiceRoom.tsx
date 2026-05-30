import "@livekit/components-styles";
import { useEffect, useState } from "react";
import {
  LiveKitRoom, useRemoteParticipants, useLocalParticipant,
  RoomAudioRenderer, ControlBar, useTracks, ParticipantTile,
  TrackRefContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PhoneOff, Phone, Sparkles, Mic, MicOff, Camera, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "";

type TokenRes = { token: string; url: string; identity: string; name: string };

export function VoiceRoom({ room, channelId, name, defaultJoined }: { room: string; channelId?: string; name?: string; defaultJoined?: boolean }) {
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
    } finally { setLoading(false); }
  }

  useEffect(() => { if (defaultJoined && !token && !loading) join(); }, [defaultJoined]);

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
          <StageGrid />
        </div>
        <div className="border-t border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 sm:px-5 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 rounded-full bg-background/60 border border-border px-2 sm:px-3 py-1.5 mx-auto sm:mx-0">
              <ControlBar variation="minimal" controls={{ microphone: true, camera: true, screenShare: true, chat: false, leave: false }} />
            </div>
            <Button variant="destructive" size="lg" className="h-11 rounded-full px-5 shrink-0"
              onClick={() => { setJoined(false); setToken(null); }}>
              <PhoneOff className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </div>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function StageGrid() {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  const participants = [localParticipant, ...remoteParticipants].filter(Boolean);
  const count = participants.length;
  const cols = count <= 1 ? "grid-cols-1" : count <= 2 ? "grid-cols-2" : count <= 4 ? "grid-cols-2 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

  if (count === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">Ninguém na sala ainda</div>;
  }

  return (
    <div className={`grid ${cols} gap-3 auto-rows-fr`} style={{ minHeight: count === 1 ? "100%" : undefined }}>
      {participants.map((p) => {
        const camTrack = cameraTracks.find(t => t.participant.identity === p.identity);
        const screenTrack = screenTracks.find(t => t.participant.identity === p.identity);
        const hasScreen = p.isScreenShareEnabled && screenTrack;
        const hasCam = p.isCameraEnabled && camTrack;
        const showVideo = hasScreen || hasCam;
        const trackRef = screenTrack || camTrack;

        return (
          <div key={p.identity}
            className={`relative rounded-2xl overflow-hidden bg-black/40 border-2 transition-all min-h-[120px] ${
              p.isSpeaking ? "border-emerald-500/60 shadow-md" : "border-transparent"
            }`}>
            {showVideo && trackRef ? (
              <TrackRefContext.Provider value={trackRef}>
                <ParticipantTile className="h-full w-full" />
              </TrackRefContext.Provider>
            ) : (
              <ParticipantCard participant={p} />
            )}
            <ParticipantInfo participant={p} />
          </div>
        );
      })}
    </div>
  );
}

function ParticipantCard({ participant }: { participant: any }) {
  const name = participant.name || "Alguém";
  let avatarUrl = "";
  try { const m = participant.metadata ? JSON.parse(participant.metadata) : {}; avatarUrl = m.avatar_url || ""; } catch {}

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-4">
      <Avatar className={`h-14 w-14 ring-2 transition-all ${participant.isSpeaking ? "ring-emerald-500/50 ring-offset-2 ring-offset-black/20" : "ring-border/20"}`}>
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="text-lg font-bold">{name[0]?.toUpperCase() || "?"}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium text-foreground/80 truncate max-w-full">{name}</span>
      {participant.isSpeaking && <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  );
}

function ParticipantInfo({ participant }: { participant: any }) {
  const micOn = participant.isMicrophoneEnabled !== false;
  const camOn = participant.isCameraEnabled;
  const screenOn = participant.isScreenShareEnabled;

  return (
    <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur rounded-full px-2.5 py-1 text-[10px] text-white/80">
      {screenOn ? <Monitor className="h-3 w-3 text-blue-400" /> : camOn ? <Camera className="h-3 w-3" /> : null}
      {micOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3 text-red-400" />}
      <span className="truncate max-w-[80px]">{participant.name || "Alguém"}</span>
    </div>
  );
}
