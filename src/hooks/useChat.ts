import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PAGE_SIZE = 50;

export type ChatMessage = {
  id: string;
  channel_id: string;
  author_id: string;
  content: string | null;
  reply_to: string | null;
  thread_root: string | null;
  edited_at: string | null;
  created_at: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
  pinned_by?: string | null;
  author?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    name_color: string | null;
    name_colors: any;
    name_effect: string | null;
    current_plan: string;
  } | null;
  status?: "sending" | "sent";
  _temp?: boolean;
};

type Page = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

type SendPayload = {
  content: string | null;
  reply_to?: string | null;
  thread_root?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
};

type EditPayload = { id: string; content: string | null };

function queryKeyFor(channelId: string) {
  return ["chat", "channel", channelId, "messages"] as const;
}

async function batchFetchProfiles(authorIds: string[]) {
  if (!authorIds.length) return new Map<string, ChatMessage["author"]>();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, name_color, name_colors, name_effect, current_plan")
    .in("id", authorIds);
  const map = new Map<string, ChatMessage["author"]>();
  for (const p of data ?? []) map.set(p.id, p as any);
  return map;
}

function addToCache(qc: ReturnType<typeof useQueryClient>, key: readonly string[], msg: ChatMessage) {
  qc.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(key, (old) => {
    if (!old?.pages?.length) return old;
    const pages = old.pages.slice();
    pages[0] = { ...pages[0], messages: [...pages[0].messages, msg] };
    return { ...old, pages };
  });
}

function removeFromCache(qc: ReturnType<typeof useQueryClient>, key: readonly string[], id: string) {
  qc.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(key, (old) => {
    if (!old?.pages?.length) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({ ...p, messages: p.messages.filter((m) => m.id !== id) })),
    };
  });
}

function updateInCache(qc: ReturnType<typeof useQueryClient>, key: readonly string[], id: string, patch: Partial<ChatMessage>) {
  qc.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(key, (old) => {
    if (!old?.pages?.length) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        messages: p.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),
    };
  });
}

export function useChat(channelId: string, userId?: string) {
  const qc = useQueryClient();
  const qk = queryKeyFor(channelId);

  const messagesQuery = useInfiniteQuery<Page, Error>({
    queryKey: qk,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const builder = supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .is("thread_root", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      const { data, error } = pageParam
        ? await builder.lt("created_at", pageParam)
        : await builder;

      if (error) throw error;
      const items = (data ?? []) as ChatMessage[];
      items.reverse();

      const profileMap = await batchFetchProfiles(
        [...new Set(items.map((m) => m.author_id).filter(Boolean))]
      );
      for (const m of items) m.author = profileMap.get(m.author_id) ?? null;

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
    mutationFn: async (payload: SendPayload) => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      if (!uid) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase.from("messages").insert({
        channel_id: channelId,
        author_id: uid,
        ...payload,
      }).select("*").maybeSingle();
      if (error) throw error;
      return data as ChatMessage | null;
    },
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<{ pages: Page[] }>(qk);

      const temp: ChatMessage = {
        id: `temp-${Date.now()}`,
        channel_id: channelId,
        author_id: userId ?? "",
        content: payload.content ?? null,
        reply_to: payload.reply_to ?? null,
        thread_root: payload.thread_root ?? null,
        edited_at: null,
        created_at: new Date().toISOString(),
        status: "sending",
        _temp: true,
      };
      addToCache(qc, qk, temp);

      return { prev, tempId: temp.id };
    },
    onError: (_err, _payload, ctx) => {
      if (ctx?.tempId) removeFromCache(qc, qk, ctx.tempId);
      const err = _err as any;
      if (err?.code === "42501") toast.error("Você está silenciado neste servidor.");
      else toast.error(err.message || "Erro ao enviar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk }),
  });

  const editMessage = useMutation({
    mutationFn: async ({ id, content }: EditPayload) => {
      const { error } = await supabase
        .from("messages")
        .update({ content, edited_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, content }) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<{ pages: Page[] }>(qk);
      updateInCache(qc, qk, id, { content, edited_at: new Date().toISOString() });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
      toast.error((_err as any)?.message || "Erro ao editar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk }),
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("messages").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<{ pages: Page[] }>(qk);
      removeFromCache(qc, qk, id);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
      toast.error((_err as any)?.message || "Erro ao deletar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk }),
  });

  const togglePinMessage = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const uid = userId || (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from("messages")
        .update({
          is_pinned: isPinned,
          pinned_at: isPinned ? new Date().toISOString() : null,
          pinned_by: isPinned ? uid : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, isPinned }) => {
      await qc.cancelQueries({ queryKey: qk });
      const prev = qc.getQueryData<{ pages: Page[] }>(qk);
      updateInCache(qc, qk, id, { is_pinned: isPinned });
      return { prev };
    },
    onSuccess: (_, { isPinned }) => {
      toast.success(isPinned ? "Mensagem fixada!" : "Mensagem desfixada!");
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk, ctx.prev);
      toast.error((_err as any)?.message || "Erro ao fixar/desfixar mensagem");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk }),
  });

  return {
    messages: (messagesQuery.data?.pages.slice().reverse().flatMap((p) => p.messages) ?? [])
      .filter((m) => !m._temp),
    tempMessages: (messagesQuery.data?.pages.slice().reverse().flatMap((p) => p.messages) ?? [])
      .filter((m) => m._temp),
    isLoading: messagesQuery.isLoading,
    isFetchingMore: messagesQuery.isFetchingNextPage,
    hasMore: Boolean(messagesQuery.hasNextPage),
    fetchMore: messagesQuery.fetchNextPage,
    refresh: messagesQuery.refetch,
    sendMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
  };
}

export function useChatCache(channelId: string) {
  const qc = useQueryClient();
  const qk = queryKeyFor(channelId);
  return {
    addMessage: (m: ChatMessage) => addToCache(qc, qk, m),
    removeMessage: (id: string) => removeFromCache(qc, qk, id),
    updateMessage: (id: string, patch: Partial<ChatMessage>) => updateInCache(qc, qk, id, patch),
    invalidate: () => qc.invalidateQueries({ queryKey: qk }),
  };
}
