import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerContext } from "./$serverId";
import { ChatContainer } from "@/components/chat";
import { MemberList } from "@/components/MemberList";
import { VoiceRoom } from "@/components/VoiceRoom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Hash, Volume2, Menu, Users, Circle,
  MessageSquare, ScrollText, MessageSquareText,
} from "lucide-react";

export const Route = createFileRoute("/app/servers/$serverId/$channelId")({
  component: ChannelView,
});

function ChannelView() {
  const { serverId, channelId } = useParams({ from: "/app/servers/$serverId/$channelId" });
  const [channel, setChannel] = useState<any>(null);
  const ctx = useServerContext();

  useEffect(() => {
    let active = true;
    supabase.from("channels").select("*").eq("id", channelId).maybeSingle().then(({ data }) => {
      if (!active) return;
      setChannel(data);
    });
    return () => { active = false; };
  }, [channelId]);

  if (!channel) return <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-8">Carregando canal…</div>;

  const isVoice = channel.type === "voice";
  const isRules = channel.type === "rules";
  const isAnnouncement = channel.type === "announcement";
  const isForum = channel.type === "forum";
  const canPost = ctx?.canManage || ctx?.memberLevel >= 60 || (!isRules && !isAnnouncement);
  const onlineCount = Array.from((ctx?.presence ?? new Map()).values()).filter((s) => s !== "offline").length;

  function channelMeta(type: string) {
    switch (type) {
      case "voice": return { icon: Volume2, color: "text-emerald-500", label: "Canal de voz" };
      case "announcement": return { icon: MessageSquare, color: "text-amber-500", label: "Anuncios" };
      case "rules": return { icon: ScrollText, color: "text-rose-500", label: "Regras" };
      case "forum": return { icon: MessageSquareText, color: "text-violet-500", label: "Forum" };
      default: return { icon: Hash, color: "text-primary/70", label: "Canal de texto" };
    }
  }
  const { icon: ChanIcon, color: chanColor } = channelMeta(channel.type);

  const header = (
    <header className="h-12 border-b border-border/80 px-3 sm:px-5 flex items-center gap-2.5 bg-card/20 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-1 md:hidden">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Mudar de canal" onClick={() => ctx?.setMobileChannelsOpen(true)}>
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <div className={`h-7 w-7 rounded-lg grid place-items-center shrink-0 ${isVoice ? "bg-emerald-500/15" : isRules ? "bg-rose-500/15" : isForum ? "bg-violet-500/15" : "bg-primary/10"}`}>
        <ChanIcon className={`h-4 w-4 ${chanColor}`} />
      </div>
      <div className="min-w-0 flex-1 md:flex-initial">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-sm truncate">{channel.name}</h2>
          {isAnnouncement && <span className="text-[10px] font-medium text-amber-500/80 uppercase tracking-wider shrink-0 bg-amber-500/10 px-1.5 py-0.5 rounded">Anuncio</span>}
          {isRules && <span className="text-[10px] font-medium text-rose-500/80 uppercase tracking-wider shrink-0 bg-rose-500/10 px-1.5 py-0.5 rounded">Regras</span>}
          {isForum && <span className="text-[10px] font-medium text-violet-500/80 uppercase tracking-wider shrink-0 bg-violet-500/10 px-1.5 py-0.5 rounded">Forum</span>}
        </div>
        <p className="text-[10px] text-muted-foreground/50 md:hidden truncate -mt-px">{ctx?.server?.name}</p>
        {channel.topic && (
          <p className="hidden md:flex items-center gap-1 text-xs text-muted-foreground/70 truncate max-w-md -mt-px">{channel.topic}</p>
        )}
      </div>
      {channel.topic && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/70 border-l border-border/60 pl-3 ml-1 truncate max-w-[200px]">{channel.topic}</span>
      )}
      <div className="ml-auto flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground/70 hover:text-foreground text-xs md:hidden">
              <Users className="h-3.5 w-3.5" />
              <Circle className={`h-2 w-2 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}`} />
              {onlineCount}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-[280px]">
            <MemberList serverId={serverId} presence={ctx?.presence ?? new Map()} />
          </SheetContent>
        </Sheet>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground/70">
          <Circle className={`h-2 w-2 ${onlineCount > 0 ? "fill-emerald-500" : "fill-muted-foreground/30"}`} />
          <span className="font-medium">{onlineCount}</span> online
        </div>
      </div>
    </header>
  );

  if (isVoice) {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-transparent to-card/10 relative">
        {header}
        <div className="flex-1 min-h-0">
          <VoiceRoom room={`panela-${channelId}`} channelId={channelId} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-transparent to-card/10 relative">
      <ChatContainer
        channelId={channelId}
        serverId={serverId}
        channelName={channel.name}
        channelType={channel.type}
        channelDescription={channel.description}
        canPost={canPost || false}
        header={header}
      />
    </div>
  );
}
