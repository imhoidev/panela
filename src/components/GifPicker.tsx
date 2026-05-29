import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY || "";

type GifResult = { id: string; media_formats: { gif: { url: string }; tinygif: { url: string } } };

let gifCache: GifResult[] = [];
let gifCacheQuery = "";

export async function searchGifs(query: string): Promise<GifResult[]> {
  if (!TENOR_API_KEY) return [];
  if (query === gifCacheQuery && gifCache.length) return gifCache;
  try {
    const r = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_API_KEY}&limit=20`);
    const j = await r.json();
    gifCache = j.results || [];
    gifCacheQuery = query;
    return gifCache;
  } catch { return []; }
}

export function GifPicker({ onSelect }: { onSelect: (url: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchGifs(query);
      setResults(r);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="w-72">
      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar GIFs…" className="mb-2 h-9 text-sm" />
      <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto">
        {loading && <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Buscando…</p>}
        {!loading && results.map((g) => (
          <button key={g.id} onClick={() => onSelect(g.media_formats.tinygif?.url || g.media_formats.gif?.url)}
            className="rounded overflow-hidden hover:ring-2 ring-primary transition-all">
            <img src={g.media_formats.tinygif?.url} alt="" className="w-full h-20 object-cover" />
          </button>
        ))}
        {!loading && query && !results.length && <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Nada encontrado</p>}
      </div>
    </div>
  );
}
