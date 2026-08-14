# PANELA — Roadmap

> Plataforma social de comunidades, vibe retrô 2008 + clean 2026.

## Stack
- **Frontend:** React 19 + Vite + TanStack Start (file-based routing) + TypeScript + Tailwind v4 + shadcn/ui + Radix + TanStack Query.
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime + RLS) + Node.js Socket.io / API Server.
- **Auth:** Email/senha + Google OAuth (Supabase Auth).
- **Voz/vídeo:** LiveKit SFU (WebRTC).
- **Push:** Web Push (VAPID) + Service Worker + Socket.io.

---

## Fase 1 — MVP (✅ entregue agora)
**Objetivo:** identidade do usuário pronta + monetização manual + base de cargos.

- [x] Schema completo de banco (profiles, user_roles, subscriptions, servers, server_members, server_roles, channels, messages, attachments, reactions, stickers, events) + RLS + GRANTs
- [x] Buckets de Storage (avatars, banners, server-icons, stickers, attachments) com policies por pasta
- [x] Auth: email/senha + Google (managed OAuth)
- [x] Trigger `handle_new_user` gera profile + username único automaticamente
- [x] Cargos globais (`user`, `admin`, `coo`, `ceo`) com `has_role()` security definer
- [x] Subscriptions PRO com fluxo manual (pending → CEO/COO aprova → active)
- [x] Editor de perfil com features condicionais por plano (FREE vs PRO)
- [x] Efeitos PRO no nome (glow, rainbow, typing, gradiente até 5 cores)
- [x] Painel Staff (aprovar PROs + atribuir/remover cargos)
- [x] Landing + design system retrô-moderno (laranja PANELA + dourado nostálgico)

---

## Fase 2 — Servidores e canais
**Objetivo:** estrutura social funcional.

- [ ] Criação de servidor (nome, descrição, ícone, banner, privacidade, idade mínima, tags de foco, templates)
- [ ] Sistema de convites (códigos únicos, expiração, max usos)
- [ ] Cargos internos (1-99) com permissões JSONB granulares por canal/categoria
- [ ] Canais texto/voz/anúncios/regras
- [ ] Canais temporários (expiram via `expires_at`)
- [ ] Descoberta pública de servidores (filtros por tag/idioma/tamanho)
- [ ] Sidebar de servidores funcional

---

## Fase 3 — Chat em tempo real
**Objetivo:** conversas vivas.

- [ ] Envio de mensagens com Markdown
- [ ] Realtime via Supabase channel `postgres_changes`
- [ ] Reply, threads (`thread_root`)
- [ ] Reações com emoji + stickers
- [ ] Anexos (upload Storage + preservação EXIF via worker)
- [ ] Typing indicator (presence channel)
- [ ] Edição/exclusão de mensagens (com moderação)
- [ ] Histórico paginado (infinite scroll)

---

## Fase 4 — Voz, vídeo e tela (LiveKit)
**Objetivo:** chamadas que escalam.

- [ ] Edge Function `livekit-token` (precisa de `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`)
- [ ] Componente `<VoiceRoom>` usando `@livekit/components-react`
- [ ] Entrar/sair de canais de voz; mic/cam toggles
- [ ] Screen share
- [ ] Chat dentro da call
- [ ] Indicador de quem está falando (Active Speaker)

---

## Fase 5 — Push, moderação e eventos
**Objetivo:** plataforma "completa".

- [ ] Service Worker + Web Push VAPID
- [ ] Edge Function `send-push` disparada por trigger de `messages`/`server_events`
- [ ] AutoMod (regex + listas) + reports + logs de moderação
- [ ] Banimentos temporários/permanentes com duração customizável
- [ ] Sistema de eventos (calendário, RSVP)
- [ ] Sistema de níveis/reputação por servidor
- [ ] PWA completo (manifest, ícones, install prompt)

---

## Fase 6 — Diferenciais PANELA
- [ ] Tema claro/escuro por servidor
- [ ] Packs de stickers exclusivos por servidor (usáveis fora se membro for PRO)
- [ ] GIF tags ao lado do nome de membros (concedidas por cargo alto)
- [ ] Modo "fórum 2008" opcional (fonte Comic Neue, layout simplificado)
- [ ] Sistema de "panelinhas" (subgrupos privados dentro de um servidor)

---

## Schema SQL
Veja [`schema.sql`](./schema.sql) na raiz do projeto para a SQL completa do banco — pronta para importar num Supabase externo se quiser.
