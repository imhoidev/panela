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

    // Use SECURITY DEFINER function to get all participants (bypasses RLS)
    const { data: allParts } = await supabase.rpc("get_dm_participants", { conv_ids: convIds });
    const partsByConv = new Map<string, any[]>();
    (allParts ?? []).forEach((p: any) => {
      const arr = partsByConv.get(p.conversation_id) ?? [];
      arr.push(p); partsByConv.set(p.conversation_id, arr);
    });

    const mapped = (convs ?? []).map((c: any) => {
      const participants = partsByConv.get(c.id) ?? [];
      return { ...c, other: participants.find((p: any) => p.user_id !== user.id) ?? null };
    });
    setConversations(mapped);

    const otherIds = [...new Set(mapped.map((c: any) => c.other?.user_id).filter(Boolean))];
    if (otherIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", otherIds);
      const m = new Map(profs?.map((p: any) => [p.id, p]) ?? []);
      setProfiles(m);
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
    const { data: parts } = await supabase.rpc("get_dm_participants_single", { conv_id: convId });
    const other = (parts ?? []).find((p: any) => p.user_id !== user.id);
    const otherId = other?.user_id;
    const newConv = { ...conv, other: other ?? null };
    if (otherId) {
      const { data: prof } = await supabase.from("profiles")
        .select("id,username,display_name,avatar_url").eq("id", otherId).maybeSingle();
      if (prof) setProfiles((prev) => new Map(prev).set(prof.id, prof));
    }
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
    const p = profiles.get(c.other?.user_id);
    return p?.username?.toLowerCase().includes(search.toLowerCase()) ||
           p?.display_name?.toLowerCase().includes(search.toLowerCase());
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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Mensagens Diretas</h2>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversas..." className="pl-8 h-9 text-xs" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {filtered.map((c: any) => {
          const p = profiles.get(c.other?.user_id);
          const active = loc.pathname === `/app/dms/${c.id}`;
          const unread = hasUnread(c);
          return (
            <Link key={c.id} to="/app/dms/$conversationId" params={{ conversationId: c.id }}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}>
              <div className="relative shrink-0">
                <Avatar className={`h-9 w-9 ${unread ? "ring-2 ring-primary/50" : ""}`}>
                  <AvatarImage src={p?.avatar_url ?? undefined} />
                  <AvatarFallback>{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                {unread && <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-primary border-2 border-sidebar" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate ${unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>
                    {p?.display_name || p?.username || "Carregando..."}
                  </p>
                  {c.last_message_at && (
                    <span className={`text-[10px] shrink-0 ${unread ? "text-primary font-medium" : "text-muted-foreground/50"}`}>
                      {timeAgo(c.last_message_at)}
                    </span>
                  )}
                </div>
                <p className={`truncate text-xs ${unread ? "text-foreground/80 font-medium" : "opacity-60"}`}>
                  {c.last_message_preview || "Nenhuma mensagem ainda"}
                </p>
              </div>
            </Link>
          );
        })}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </p>
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
