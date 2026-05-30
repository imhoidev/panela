import "@livekit/components-styles";
import { useEffect, useState, useCallback } from "react";
import {
  LiveKitRoom, useRemoteParticipants, useLocalParticipant,
  RoomAudioRenderer, ControlBar,
} from "@livekit/components-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, PhoneOff, Phone, Sparkles, Maximize2, Minimize2,
} from "lucide-react";
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
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [fullScreenId, setFullScreenId] = useState<string | null>(null);

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

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { setFocusedId(null); setFullScreenId(null); }
  }, []);
  useEffect(() => { document.addEventListener("keydown", handleEscape); return () => document.removeEventListener("keydown", handleEscape); }, [handleEscape]);

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
      onDisconnected={() => { setJoined(false); setToken(null); setFocusedId(null); setFullScreenId(null); }}
      className="h-full"
    >
      <div className="flex flex-col h-full bg-gradient-to-b from-background to-card/40">
        <div className="flex-1 min-h-0 overflow-auto p-3 sm:p-4">
          <StageInner
            focusedId={focusedId}
            fullScreenId={fullScreenId}
            onFocus={(id) => setFocusedId(id)}
            onFullscreen={(id) => { setFullScreenId(fullScreenId === id ? null : id); setFocusedId(id); }}
          />
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
              onClick={() => { setJoined(false); setToken(null); setFocusedId(null); setFullScreenId(null); }}
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
  focusedId, fullScreenId, onFocus, onFullscreen,
}: {
  focusedId: string | null; fullScreenId: string | null;
  onFocus: (id: string) => void; onFullscreen: (id: string) => void;
}) {
  const remoteParticipants = useRemoteParticipants();
  const { localParticipant } = useLocalParticipant();
  const all = [localParticipant, ...remoteParticipants].filter(Boolean);

  const focusTarget = focusedId ? all.find((p) => p.identity === focusedId) : all[0];

  const gridCols = all.length <= 1 ? "grid-cols-1" : all.length <= 2 ? "grid-cols-2" : all.length <= 4 ? "grid-cols-2" : "grid-cols-3";

  if (focusTarget && all.length > 1) {
    return (
      <div className="h-full flex flex-col">
        <div className="relative flex-1 min-h-0 mb-2">
          <ParticipantCard participant={focusTarget} large />
          <div className="absolute top-2 right-2 flex gap-1.5 z-10">
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70"
              onClick={() => onFullscreen(focusTarget.identity)}>
              {fullScreenId ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto p-2 shrink-0">
          {all.filter((p) => p.identity !== focusTarget.identity).map((p) => (
            <div key={p.identity} onClick={() => onFocus(p.identity)}
              role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter") onFocus(p.identity); }}
              className="shrink-0 cursor-pointer">
              <ParticipantCard participant={p} compact />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full grid ${gridCols} gap-3 place-items-center`}>
      {all.map((p) => (
        <ParticipantCard key={p.identity} participant={p} />
      ))}
    </div>
  );
}

function ParticipantCard({ participant, large, compact }: { participant: any; large?: boolean; compact?: boolean }) {
  const name = participant.identity?.replace(/[_-]/g, " ") || "Alguém";
  const isSpeaking = participant.isSpeaking;
  const isMuted = participant.isMicrophoneEnabled === false;
  const initial = name[0]?.toUpperCase() || "?";

  if (compact) {
    return (
      <div className={`flex items-center gap-2 rounded-lg px-3 py-2 border transition-all ${
        isSpeaking ? "border-primary/60 bg-primary/5" : "border-border bg-card/50"
      }`}>
        <div className={`h-8 w-8 rounded-full grid place-items-center text-sm font-bold shrink-0 transition-all ${
          isSpeaking ? "bg-primary text-primary-foreground ring-2 ring-primary/50" : "bg-accent text-muted-foreground"
        }`}>
          {initial}
        </div>
        <span className="text-xs font-medium truncate max-w-[80px]">{name}</span>
        {isMuted && <span className="text-[10px] text-muted-foreground/50">🔇</span>}
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 ${
      isSpeaking ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10" : "border-border bg-card/50"
    } ${large ? "w-full h-full min-h-[180px] p-6" : "w-full min-h-[100px] p-4"}`}>
      <div className={`rounded-full grid place-items-center font-bold transition-all ${
        isSpeaking ? "bg-primary text-primary-foreground ring-3 ring-primary/40 scale-105" : "bg-accent text-muted-foreground"
      } ${large ? "h-16 w-16 text-xl" : "h-12 w-12 text-base"}`}>
        {initial}
      </div>
      <span className={`font-medium truncate max-w-full text-center ${large ? "text-base" : "text-sm"}`}>{name}</span>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>{isMuted ? "🔇 Mutado" : "🎤 Falando"}</span>
        {isSpeaking && <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
      </div>
    </div>
  );
}
