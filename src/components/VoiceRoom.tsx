import "@livekit/components-styles";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  LiveKitRoom, useRemoteParticipants, useLocalParticipant,
  RoomAudioRenderer, ControlBar, useTracks, VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, PhoneOff, Phone, Sparkles, Maximize2, Minimize2, Mic, MicOff,
  Camera, CameraOff, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "";

type TokenRes = { token: string; url: string; identity: string; name: string };

export function VoiceRoom({
  room, channelId, name, defaultJoined,
}: { room: string; channelId?: string; name?: string; defaultJoined?: boolean }) {
  const [token, setToken] = useState<TokenRes | null>(null);
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(!!defaultJoined);
  const [focusedId, setFocusedId] = useState<string | null>(null);

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
      onDisconnected={() => { setJoined(false); setToken(null); setFocusedId(null); }}
      className="h-full"
    >
      <div className="flex flex-col h-full bg-gradient-to-b from-background to-card/40">
        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">
          <StageInner focusedId={focusedId} onFocus={setFocusedId} />
        </div>
        <div className="border-t border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 sm:px-5 py-3 sm:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-center justify-center sm:justify-start">
              <div className="flex items-center gap-2 sm:gap-3 rounded-full bg-background/60 border border-border px-2 sm:px-3 py-1.5">
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
              onClick={() => { setJoined(false); setToken(null); setFocusedId(null); }}
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

function StageInner({
  focusedId, onFocus,
}: {
  focusedId: string | null;
  onFocus: (id: string | null) => void;
}) {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const cameraTracks = useTracks([Track.Source.Camera]);
  const screenTracks = useTracks([Track.Source.ScreenShare]);

  const participants = useMemo(() => {
    return [localParticipant, ...remoteParticipants].filter(Boolean);
  }, [localParticipant, remoteParticipants]);

  const hasCamera = useCallback((p: any) => {
    return p.isCameraEnabled && cameraTracks.some(t => t.participant.identity === p.identity);
  }, [cameraTracks]);

  const hasScreen = useCallback((p: any) => {
    return p.isScreenShareEnabled && screenTracks.some(t => t.participant.identity === p.identity);
  }, [screenTracks]);

  const getCamTrack = useCallback((identity: string) => {
    return cameraTracks.find(t => t.participant.identity === identity);
  }, [cameraTracks]);

  const getScreenTrack = useCallback((identity: string) => {
    return screenTracks.find(t => t.participant.identity === identity);
  }, [screenTracks]);

  const activeTrack = useCallback((p: any) => {
    if (hasScreen(p)) return { track: getScreenTrack(p.identity), type: "screen" as const };
    if (hasCamera(p)) return { track: getCamTrack(p.identity), type: "camera" as const };
    return null;
  }, [hasScreen, hasCamera, getScreenTrack, getCamTrack]);

  if (participants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground/50 text-sm">
        Ninguém na sala ainda
      </div>
    );
  }

  const focusTarget = focusedId ? participants.find(p => p.identity === focusedId) : participants[0];
  const gridCols = participants.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : participants.length <= 4 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  if (focusTarget && participants.length > 1) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="relative flex-1 min-h-0 rounded-2xl overflow-hidden bg-black/40">
          <ParticipantVideo participant={focusTarget} activeTrack={activeTrack(focusTarget)} large />
          <div className="absolute bottom-3 left-3 z-10">
            <ParticipantInfo participant={focusTarget} />
          </div>
          <div className="absolute top-3 right-3 z-10 flex gap-1">
            <FullscreenButton targetClass="voice-stage-focus" />
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur"
              onClick={() => onFocus(focusTarget.identity === focusedId ? null : focusTarget.identity)}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
          {participants.filter(p => p.identity !== focusTarget.identity).map(p => (
            <button key={p.identity} onClick={() => onFocus(p.identity)}
              className="shrink-0 relative w-28 h-20 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all bg-black/40">
              <ParticipantVideo participant={p} activeTrack={activeTrack(p)} compact />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                <p className="text-[10px] text-white/90 truncate flex items-center gap-1">
                  {p.isMicrophoneEnabled === false && <MicOff className="h-2.5 w-2.5 text-red-400" />}
                  {p.name || p.identity.slice(0, 8)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols} gap-3 auto-rows-fr voice-stage-focus`} style={{ minHeight: participants.length === 1 ? "100%" : undefined }}>
      {participants.map(p => (
        <div key={p.identity}
          className={`relative rounded-2xl overflow-hidden bg-black/40 border-2 transition-all min-h-[120px] ${
            p.isSpeaking ? "border-emerald-500/60 shadow-lg shadow-emerald-500/10" : "border-transparent"
          }`}>
          <ParticipantVideo participant={p} activeTrack={activeTrack(p)} />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <ParticipantInfo participant={p} />
            {participants.length > 1 && (
              <Button size="icon" variant="ghost"
                className="h-7 w-7 rounded-full bg-black/40 hover:bg-black/60 text-white/70"
                onClick={() => onFocus(p.identity)} title="Focar">
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ParticipantVideo({ participant, activeTrack, large, compact }: {
  participant: any; activeTrack: { track: any; type: string } | null; large?: boolean; compact?: boolean;
}) {
  if (activeTrack) {
    return (
      <VideoTrack
        trackRef={activeTrack.track}
        className={`h-full w-full ${activeTrack.type === "screen" ? "object-contain" : "object-cover"}`}
      />
    );
  }
  return <ParticipantFace participant={participant} large={large} compact={compact} />;
}

function ParticipantFace({ participant, large, compact }: { participant: any; large?: boolean; compact?: boolean }) {
  const name = participant.name || participant.identity || "Alguém";
  let avatarUrl = "";
  try { const m = participant.metadata ? JSON.parse(participant.metadata) : {}; avatarUrl = m.avatar_url || ""; } catch {}

  if (compact) {
    return (
      <div className="h-full w-full grid place-items-center">
        <Avatar className="h-8 w-8">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-[10px]">{name[0]?.toUpperCase() || "?"}</AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center gap-3 ${large ? "p-8" : "p-4"}`}>
      <div className={`relative ${large ? "h-20 w-20" : "h-14 w-14"}`}>
        <Avatar className={`h-full w-full ring-2 transition-all ${participant.isSpeaking ? "ring-emerald-500/50 ring-offset-2 ring-offset-black/40" : "ring-border/30"}`}>
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className={`${large ? "text-2xl" : "text-lg"} font-bold`}>
            {name[0]?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        {participant.isSpeaking && (
          <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-black/40" />
        )}
      </div>
      <span className={`font-medium text-foreground/80 truncate max-w-full text-center ${large ? "text-lg" : "text-sm"}`}>
        {name}
      </span>
      {participant.isSpeaking && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />Falando
        </span>
      )}
    </div>
  );
}

function ParticipantInfo({ participant }: { participant: any }) {
  const micOn = participant.isMicrophoneEnabled !== false;
  const camOn = participant.isCameraEnabled;
  const screenOn = participant.isScreenShareEnabled;
  let avatarUrl = "";
  try { const m = participant.metadata ? JSON.parse(participant.metadata) : {}; avatarUrl = m.avatar_url || ""; } catch {}
  return (
    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur rounded-full px-2.5 py-1 text-[10px] text-white/80">
      <Avatar className="h-5 w-5">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="text-[8px]">{(participant.name || participant.identity || "?")[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      {screenOn ? <Monitor className="h-3 w-3 text-blue-400" /> : camOn ? <Camera className="h-3 w-3" /> : null}
      {micOn ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3 text-red-400" />}
      <span className="truncate max-w-[80px]">{participant.name || participant.identity.slice(0, 8)}</span>
    </div>
  );
}

function FullscreenButton({ targetClass }: { targetClass: string }) {
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const onchange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onchange);
    return () => document.removeEventListener("fullscreenchange", onchange);
  }, []);

  async function toggle() {
    if (isFull) { await document.exitFullscreen(); return; }
    const el = document.querySelector(`.${targetClass}`) as HTMLElement;
    if (el) await el.requestFullscreen();
  }

  return (
    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur" onClick={toggle}>
      {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
    </Button>
  );
}
