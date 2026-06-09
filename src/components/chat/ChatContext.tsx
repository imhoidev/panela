import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { ChatMessage } from "@/hooks/useChat";

type RoleEntry = { name: string; color: string | null; gif_tag_url: string | null; level?: number };

type ChatCtx = {
  replyTo: ChatMessage | null;
  setReplyTo: (m: ChatMessage | null) => void;
  cancelReply: () => void;
  editingId: string | null;
  editText: string;
  setEditing: (m: ChatMessage | null) => void;
  setEditText: (t: string) => void;
  cancelEdit: () => void;
  roleCache: Map<string, RoleEntry[]>;
  setRoleCache: (m: Map<string, RoleEntry[]>) => void;
  userId?: string;
};

const ChatContext = createContext<ChatCtx | null>(null);

export function ChatProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [roleCache, setRoleCache] = useState<Map<string, RoleEntry[]>>(new Map());

  const setEditing = useCallback((m: ChatMessage | null) => {
    setEditingId(m?.id ?? null);
    setEditText(m?.content ?? "");
  }, []);

  const cancelReply = useCallback(() => setReplyTo(null), []);
  const cancelEdit = useCallback(() => { setEditingId(null); setEditText(""); }, []);

  return (
    <ChatContext.Provider value={{
      replyTo, setReplyTo, cancelReply,
      editingId, editText, setEditing, setEditText, cancelEdit,
      roleCache, setRoleCache, userId,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
