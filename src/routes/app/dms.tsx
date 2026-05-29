import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Menu, MessageSquare, Plus, Search, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/dms")({
  component: DMLayout,
});

function DMLayout() {
  const { user, profile } = useAuth();
  const loc = useLocation();
  const [conversations, setConversations] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [openSheet, setOpenSheet] = useState(false);
  const [search, setSearch] = useState("");

  async function loadDMs() {
    if (!user) return;
    const { data } = await supabase
      .from("dm_conversations")
      .select("*, dm_participants!inner(*), dm_messages(id,content,created_at,author_id)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    const convs = (data ?? []).map((c: any) => ({
      ...c,
      other: c.dm_participants?.find((p: any) => p.user_id !== user.id),
    }));
    setConversations(convs);
    const ids = [...new Set(convs.map((c: any) => c.other?.user_id).filter(Boolean))];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,username,display_name,avatar_url").in("id", ids);
      const m = new Map(profs?.map((p: any) => [p.id, p]) ?? []);
      setProfiles(m);
    }
  }

  useEffect(() => { loadDMs(); }, [user?.id]);

  // Realtime: update list on new dm messages
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("dm-list")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "dm_messages",
      }, async (payload: any) => {
        const msg = payload.new;
        // Only refresh if participant
        const { data: parts } = await supabase
          .from("dm_participants").select("user_id").eq("conversation_id", msg.conversation_id);
        if (parts?.some((p: any) => p.user_id === user.id)) loadDMs();
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

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="font-semibold text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Mensagens Diretas</h2>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conversas..."
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {filtered.map((c: any) => {
          const p = profiles.get(c.other?.user_id);
          const active = loc.pathname === `/app/dms/${c.id}`;
          return (
            <Link
              key={c.id}
              to="/app/dms/$conversationId"
              params={{ conversationId: c.id }}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={p?.avatar_url ?? undefined} />
                <AvatarFallback>{p?.username?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground/90">{p?.display_name || p?.username || "Carregando..."}</p>
                <p className="truncate text-xs opacity-60">{c.last_message_preview || "Nenhuma mensagem ainda"}</p>
              </div>
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden md:flex w-72 flex-col border-r border-border bg-sidebar">
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
        <Outlet />
      </div>
    </div>
  );
}
