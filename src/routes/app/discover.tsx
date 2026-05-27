import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/app/discover")({
  head: () => ({ meta: [{ title: "Descobrir — PANELA" }] }),
  component: () => (
    <div className="max-w-4xl mx-auto p-8 space-y-3">
      <h1 className="text-2xl font-bold">Descobrir servidores</h1>
      <p className="text-muted-foreground">A descoberta pública chega na Fase 2 do roadmap — junto com a criação de servidores e canais.</p>
    </div>
  ),
});
