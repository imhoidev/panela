import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Search, Hash, Users, MessageSquare, Command, ArrowRight } from "lucide-react";

type Result = {
  type: "server" | "channel" | "message";
  id: string;
  label: string;
  sublabel?: string;
  to: string;
};

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setOpen((p) => !p); }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else { setQuery(""); setResults([]); setIdx(0); }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.trim().toLowerCase();
    setLoading(true);
    const timer = setTimeout(async () => {
      const all: Result[] = [];

      const { data: servers } = await supabase.from("servers").select("id,name").ilike("name", `%${q}%`).limit(5);
      for (const s of servers ?? []) all.push({ type: "server", id: s.id, label: s.name, sublabel: "Servidor", to: `/app/servers/${s.id}` });

      const { data: channels } = await supabase.from("channels").select("id,name,server_id").ilike("name", `%${q}%`).limit(5);
      for (const c of channels ?? []) all.push({ type: "channel", id: c.id, label: `#${c.name}`, sublabel: "Canal", to: `/app/servers/${c.server_id}/${c.id}` });

      setResults(all);
      setIdx(0);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const go = useCallback((r: Result) => { setOpen(false); navigate({ to: r.to as any }); }, [navigate]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && results[idx]) go(results[idx]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Buscar servidores, canais…"
            className="flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Command className="h-3 w-3" />K
          </kbd>
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {loading && <p className="text-xs text-muted-foreground px-2 py-4 text-center">Buscando…</p>}
          {!loading && results.length === 0 && query && <p className="text-xs text-muted-foreground px-2 py-4 text-center">Nada encontrado</p>}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}`}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${i === idx ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}
              onClick={() => go(r)}
              onMouseEnter={() => setIdx(i)}
            >
              <span className="shrink-0 text-muted-foreground">
                {r.type === "server" ? <Users className="h-4 w-4" /> : r.type === "channel" ? <Hash className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium">{r.label}</div>
                <div className="truncate text-xs text-muted-foreground">{r.sublabel}</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
