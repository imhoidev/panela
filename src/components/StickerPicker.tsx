import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Sticker = { id: string; image_url: string; name: string };

export function StickerPicker({ onSelect, serverId }: { onSelect: (url: string) => void; serverId?: string }) {
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!serverId) return;
    const q = supabase.from("stickers").select("id, image_url, name").eq("server_id", serverId);
    if (search.trim()) q.ilike("name", `%${search}%`);
    q.limit(40).then(({ data }) => setStickers((data ?? []) as Sticker[]));
  }, [serverId, search]);

  return (
    <div className="w-64">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar sticker…" className="mb-2 h-9 text-sm" />
      <ScrollArea className="max-h-60">
        <div className="grid grid-cols-4 gap-1.5">
          {stickers.map((s) => (
            <button key={s.id} onClick={() => onSelect(s.image_url)}
              className="rounded overflow-hidden hover:ring-2 ring-primary transition-all p-1">
              <img src={s.image_url} alt={s.name} className="w-full aspect-square object-contain" />
            </button>
          ))}
          {!stickers.length && <p className="col-span-4 text-xs text-muted-foreground text-center py-4">Nenhum sticker</p>}
        </div>
      </ScrollArea>
    </div>
  );
}
