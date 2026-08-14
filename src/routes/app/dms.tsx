import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Menu, MessageSquare, Search, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/app/dms")({
  component: DMLayout,
});

function DMLayout() {
  const { user } = useAuth();
  const loc = useLocation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [myParts, setMyParts] = useState<Map<string, string>>(new Map());
  const [openSheet, setOpenSheet] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadDMs(showLoader = true) {
    if (!user) return;
    if (showLoader) setLoading(true);

    const { data: myParts } = await supabase
      .from("dm_participants")
      .select("conversation_id, last_read_at")
      .eq("user_id", user.id);
    const convIds = (myParts ?? []).map((p: any) => p.conversation_id);
    if (!convIds.length) { setConversations([]); setMyParts(new Map()); setProfiles(new Map()); if (showLoader) setLoading(false); return; }

    const lastReadMap = new Map<string, string>();
    (myParts ?? []).forEach((p: any) => { if (p.last_read_at) lastReadMap.set(p.conversation_id, p.last_read_at); });
    setMyParts(lastReadMap);

    const { data: convs } = await supabase
      .from("dm_conversations")
      .select("*")
      .in("id", convIds)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    const { data: allParts } = await (supabase.rpc as any)("get_dm_participants", { conv_ids: convIds });
    const partsByConv = new Map<string, any[]>();
    ((allParts as any[]) ?? []).forEach((p: any) => {
      const arr = partsByConv.get(p.conversation_id) ?? [];
      arr.push(p); partsByConv.set(p.conversation_id, arr);
    });

    const allIds = new Set<string>();
    const mapped = (convs ?? []).map((c: any) => {
      const participants = partsByConv.get(c.id) ?? [];
      participants.forEach((p: any) => allIds.add(p.user_id));
      const others = participants.filter((p: any) => p.user_id !== user.id);
      return {
        ...c,
        participants,
        others,
        isGroup: participants.length > 2,
        title: "Carregando...",
        preview: c.last_message_preview || "Nenhuma mensagem ainda",
      };
    });

    if (allIds.size) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url,status,status_text").in("id", [...allIds]);
      const m = new Map(profs?.map((p: any) => [p.id, p]) ?? []);
      setProfiles(m);
      setConversations(mapped.map((c: any) => {
        const names = (c.others ?? []).map((p: any) => m.get(p.user_id)?.display_name || m.get(p.user_id)?.username || "Usuário");
        const title = names.length === 0 ? "Conversação" : names.length === 1 ? names[0] : `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
        const otherProfile = c.others[0] ? { ...c.others[0], ...(m.get(c.others[0]?.user_id) ?? {}) } : null;
        return {
          ...c,
          title,
          preview: c.last_message_preview || "Nenhuma mensagem ainda",
          participantsProfiles: c.participants.map((p: any) => m.get(p.user_id) ?? null),
          other: otherProfile,
        };
      }));
    } else {
      setConversations(mapped);
    }

    if (showLoader) setLoading(false);
  }

  useEffect(() => { loadDMs(); }, [user?.id]);

  useEffect(() => {
    if (loc.pathname === "/app/dms") loadDMs(false);
  }, [loc.pathname]);

  async function fetchNewConversation(convId: string) {
    if (!user) return;
    const { data: conv } = await supabase.from("dm_conversations").select("*").eq("id", convId).single();
    if (!conv) return;
    const { data: parts } = await (supabase.rpc as any)("get_dm_participants_single", { conv_id: convId });
    const participants = (parts as any[]) ?? [];
    const otherParticipants = participants.filter((p: any) => p.user_id !== user.id);
    const ids = [...new Set(participants.map((p: any) => p.user_id))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles")
        .select("id,username,display_name,avatar_url,status,status_text").in("id", ids as string[]);
      if (profs) profs.forEach((prof: any) => setProfiles((prev) => new Map(prev).set(prof.id, prof)));
    }
    const names = (otherParticipants as any[]).map((p: any) => {
      const prof = profiles.get(p.user_id);
      return prof?.display_name || prof?.username || "Usuário";
    });
    const title = names.length === 0 ? "Conversação" : names.length === 1 ? names[0] : `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`;
    const otherProfile = (otherParticipants as any[])[0] ? { ...(otherParticipants as any[])[0], ...(profiles.get((otherParticipants as any[])[0]?.user_id) ?? {}) } : null;
    const newConv = {
      ...conv,
      participants,
      others: otherParticipants,
      isGroup: participants.length > 2,
      title,
      preview: conv.last_message_preview || "Nenhuma mensagem ainda",
      participantsProfiles: participants.map((p: any) => profiles.get(p.user_id) ?? null),
      other: otherProfile,
    };
    setConversations((prev) => {
      if (prev.some((c) => c.id === convId)) return prev;
      return [...prev, newConv].sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    });
  }

  // Targeted realtime + fetch new conversations
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("dm-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" },
        (payload: any) => {
          const msg = payload.new;
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === msg.conversation_id);
            if (exists) {
              const updated = prev.map((c) =>
                c.id === msg.conversation_id
                  ? { ...c, last_message_preview: msg.content?.slice(0, 120) || "📎 Arquivo", last_message_at: msg.created_at }
                  : c
              );
              return updated.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
            }
            return prev;
          });
          fetchNewConversation(msg.conversation_id);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const inChat = loc.pathname.match(/^\/app\/dms\/[^/]+$/);
  const filtered = conversations.filter((c: any) => {
    if (!search) return true;
    const title = String(c.title || "").toLowerCase();
    return title.includes(search.toLowerCase());
  });

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }

  function hasUnread(c: any): boolean {
    const readAt = myParts.get(c.id);
    return !!c.last_message_at && (!readAt || new Date(c.last_message_at) > new Date(readAt));
  }

  const sidebar = (
    <div className="flex flex-col h-full bg-sidebar/90 backdrop-blur-md">
      <div className="p-4 border-b border-sidebar-border/60">
        <h2 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary/70" /> Mensagens Diretas</h2>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversas..." className="pl-8 h-9 text-xs bg-sidebar-accent/30 border-sidebar-border/50 focus:bg-sidebar-accent/50 transition-colors backdrop-blur-sm" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {filtered.map((c: any) => {
          const active = loc.pathname === `/app/dms/${c.id}`;
          const unread = hasUnread(c);
          const title = c.title || "Carregando...";
          const subtitle = c.isGroup ? `${c.participants?.length ?? 0} membros` : "Privado";
          const avatars = (c.participantsProfiles ?? []).filter((p: any) => p?.id !== user?.id).slice(0, 3);
          return (
            <Link key={c.id} to="/app/dms/$conversationId" params={{ conversationId: c.id }}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}>
              <div className="relative shrink-0">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full bg-accent/80 ring-1 ring-border" />
                  <div className="flex">
                    {avatars.map((profile: any, idx: number) => (
                      <Avatar key={profile?.id ?? idx} className={`h-8 w-8 ring-2 ring-card ${idx > 0 ? "-ml-2" : ""}`}>
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback>{profile?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                      </Avatar>
                    ))}
                    {!avatars.length && (
                      <Avatar className="h-9 w-9">
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </div>
                {!c.isGroup && c.other && (
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar ${
                    c.other?.status === "online" ? "bg-emerald-500"
                    : c.other?.status === "idle" ? "bg-yellow-500"
                    : c.other?.status === "dnd" ? "bg-red-500"
                    : "bg-muted-foreground/30"
                  }`} />
                )}
                {unread && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-sidebar" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                    {title}
                  </p>
                  {c.last_message_at && (
                    <span className={`text-[10px] shrink-0 ${unread ? "text-primary font-medium" : "text-muted-foreground/50"}`}>
                      {timeAgo(c.last_message_at)}
                    </span>
                  )}
                </div>
                <p className={`truncate text-xs ${unread ? "text-foreground/80 font-medium" : "opacity-60"}`}>
                  {c.preview}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{subtitle}</p>
              </div>
            </Link>
          );
        })}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="h-12 w-12 rounded-2xl bg-muted/30 grid place-items-center mx-auto mb-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-xs font-medium text-muted-foreground/70">
              {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
            </p>
            <p className="text-[10px] text-muted-foreground/40 mt-1">
              {search ? "Tente outro termo de busca" : "Inicie uma conversa pelo perfil de um usuário"}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden md:flex w-72 flex-col border-r border-border bg-sidebar shrink-0">
        {sidebar}
      </aside>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="md:hidden flex items-center gap-2 px-2 h-11 border-b border-border bg-sidebar/80 shrink-0">
          <Sheet open={openSheet} onOpenChange={setOpenSheet}>
            <SheetTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5"><Menu className="h-4 w-4" />DMs</Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[300px] bg-sidebar">
              <SheetHeader className="sr-only"><SheetTitle>Mensagens</SheetTitle></SheetHeader>
              {sidebar}
            </SheetContent>
          </Sheet>
          {inChat && (
            <Link to="/app/dms" className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </Link>
          )}
        </div>
        <div className="flex-1 min-w-0 min-h-0 flex">
          <div className="flex-1 min-w-0 min-h-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
