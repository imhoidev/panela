import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAGE_SIZE = 50;

type ChatMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  content: string | null;
  reply_to: string | null;
  thread_root: string | null;
  edited_at: string | null;
  created_at: string;
  author?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    name_color: string | null;
    name_colors: any;
    name_effect: string | null;
    current_plan: string;
  } | null;
};

type Page = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

export function useChat(channelId: string, userId?: string) {
  const qc = useQueryClient();
  const queryKey = ["chatMessages", channelId];

  const messagesQuery = useInfiniteQuery<Page, Error>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const builder = supabase
        .from("messages")
        .select("*, author:profiles!author_id(username, display_name, avatar_url, name_color, name_colors, name_effect, current_plan)")
        .eq("channel_id", channelId)
        .is("thread_root", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const { data, error } = pageParam
        ? await builder.lt("created_at", pageParam)
        : await builder;

      if (error) throw error;
      const items = ((data ?? []) as any[]).reverse();
      return {
        messages: items,
        nextCursor: items.length === PAGE_SIZE ? items[0].created_at : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!channelId,
    staleTime: 15_000,
  });

  const sendMessage = useMutation({
    mutationFn: async (payload: {
      content: string | null;
      reply_to?: string | null;
      thread_root?: string | null;
      attachment_url?: string | null;
      attachment_type?: string | null;
    }) => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase.from("messages").insert({
        channel_id: channelId,
        author_id: uid,
        ...payload,
      }).select().maybeSingle();
      if (error) throw error;
      return data as ChatMessage | null;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err: any) => {
      if (err?.code === "42501") toast.error("Você está silenciado neste servidor.");
      else toast.error(err.message || "Erro ao enviar mensagem");
    },
  });

  const editMessage = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string | null }) => {
      const { error } = await supabase.from("messages").update({ content, edited_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err: any) => toast.error(err.message || "Erro ao editar mensagem"),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err: any) => toast.error(err.message || "Erro ao deletar mensagem"),
  });

  return {
    messages: messagesQuery.data?.pages.slice().reverse().flatMap((page) => page.messages) ?? [],
    isLoading: messagesQuery.isLoading,
    isFetchingMore: messagesQuery.isFetchingNextPage,
    hasMore: Boolean(messagesQuery.hasNextPage),
    fetchMore: messagesQuery.fetchNextPage,
    refresh: messagesQuery.refetch,
    sendMessage,
    editMessage,
    deleteMessage,
  };
}
