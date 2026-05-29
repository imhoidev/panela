import "@livekit/components-styles";
import { useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  LayoutContextProvider,
  FocusLayout,
  CarouselLayout,
  useTracks,
  usePinnedTracks,
  useParticipants,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, PhoneOff, Phone, Sparkles, Maximize2, Minimize2, Users } from "lucide-react";
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
      <LayoutContextProvider>
        <Stage onLeave={() => { setJoined(false); setToken(null); }} />
      </LayoutContextProvider>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function Stage({ onLeave }: { onLeave: () => void }) {
  const participants = useParticipants();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  const screenShares = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.ScreenShare),
    [tracks],
  );

  // Pinned trumps everything; else, auto-focus first active screen share.
  const pinned = usePinnedTracks();
  const focusTrack = pinned?.[0] ?? screenShares[0] ?? null;
  const carouselTracks = useMemo(
    () => (focusTrack ? tracks.filter((t) => t !== focusTrack) : tracks),
    [tracks, focusTrack],
  );

  const [fullscreen, setFullscreen] = useState(false);
  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) { await document.documentElement.requestFullscreen(); setFullscreen(true); }
      else { await document.exitFullscreen(); setFullscreen(false); }
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-card/40">
      <div className="flex items-center justify-between px-3 sm:px-5 py-2 border-b border-border bg-card/40 backdrop-blur">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{participants.length} {participants.length === 1 ? "pessoa" : "pessoas"}</span>
          {screenShares.length > 0 && (
            <span className="ml-2 hidden sm:inline rounded-full bg-primary/15 text-primary px-2 py-0.5 border border-primary/30 text-[11px]">
              {screenShares.length} transmissão{screenShares.length > 1 ? "ões" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFs} title="Tela cheia">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden p-2 sm:p-3">
        {focusTrack ? (
          <div className="flex flex-col lg:flex-row gap-2 h-full">
            <div className="flex-1 min-h-0 lk-focus-wrap">
              <FocusLayout trackRef={focusTrack} />
            </div>
            {carouselTracks.length > 0 && (
              <div className="lg:w-48 lg:h-full h-28 shrink-0 overflow-auto">
                <CarouselLayout tracks={carouselTracks} orientation="vertical">
                  <ParticipantTile />
                </CarouselLayout>
              </div>
            )}
          </div>
        ) : (
          <GridLayout tracks={tracks} style={{ height: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        )}
      </div>

      <div className="border-t border-border bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground text-center sm:text-left hidden sm:block">
            Toque num bloco pra fixar · Clique numa transmissão pra colocar em foco
          </p>
          <div className="flex-1 sm:flex-none flex items-center justify-center">
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
            onClick={onLeave}
          >
            <PhoneOff className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
