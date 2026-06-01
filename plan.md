# PANELA — Plano de Desenvolvimento

> **Stack real:** React 19 + TanStack Start (SSR) + TypeScript + Tailwind v4 + shadcn/ui + Radix + TanStack Query + Socket.io + Supabase (Postgres + Auth + Storage + Realtime) + LiveKit + Web Push VAPID  
> **Deploy:** Frontend → Vercel (Build Output API v3) · Backend → Render (Node HTTP + Socket.io)

---

## ✅ COMPLETO — 100% Implementado

### Core Platform
- [x] Auth: email/senha + Google OAuth (Supabase + Lovable Cloud)
- [x] Signup com criação automática de perfil
- [x] Sessão persistente com guardas (RequireAuth, RequireGuest)
- [x] Perfil do usuário: avatar, banner, bio, display_name, name_color, name_effect (glow/rainbow/typing), status
- [x] Cargos globais: `user`, `admin`, `coo`, `ceo` com `has_role()` security definer
- [x] PRO Subscriptions com fluxo manual (pending → active/canceled/rejected)
- [x] Painel Staff (aprovar PRO, atribuir/remover cargos)

### Servidores & Canais
- [x] Criação com nome, descrição, ícone, banner, privacidade, idade mínima, tags de foco
- [x] Slug único automático, redirect `/app/s/:slug`
- [x] Owner vira membro level 99 automaticamente
- [x] Member count mantido por trigger
- [x] Entrar/sair de servidores
- [x] Sidebar esquerda com lista de servidores e canais
- [x] Descoberta pública `/app/discover`
- [x] Canais: text, voice, announcement, rules, forum com posição ordenada

### Chat em Tempo Real
- [x] Envio de mensagens via Supabase insert
- [x] Realtime via Supabase `postgres_changes` (INSERT/UPDATE/DELETE)
- [x] **Markdown rendering** com `react-markdown` + `remark-gfm` (negrito, itálico, código, links, listas, imagens)
- [x] **Infinite scroll** com IntersectionObserver (carrega mais 50 ao scrollar topo)
- [x] Reações com emoji (picker popover + toggle)
- [x] Edição/exclusão de mensagens
- [x] Reply (resposta com referência)
- [x] **Threads** — botão na toolbar abre `/app/servers/$serverId/threads/$messageId` com respostas em tempo real
- [x] Typing indicator via Socket.io
- [x] **GIF picker** (Tenor API) integrado na toolbar
- [x] **Sticker picker** integrado na toolbar (busca stickers do servidor)
- [x] Anexos: upload via backend → Supabase Storage
- [x] Preview inline: imagens, vídeos, áudio, arquivos
- [x] Online count no header do canal

### Voz / Vídeo / Tela
- [x] LiveKit token via backend
- [x] Grid responsivo com todos os participantes (audio-only + video)
- [x] Foco em um participante (clique no tile)
- [x] Fullscreen (botão maximize/minimize)
- [x] Screenshare como foco automático
- [x] Thumbnail strip de outros participantes no modo foco
- [x] Badge "Tela" em quem está compartilhando
- [x] Escape para sair do foco/fullscreen

### Push Notifications
- [x] Service Worker com cache + push listener + notification click handler
- [x] PWA Manifest
- [x] Registro automático do SW
- [x] UI em `/app/settings` para ativar/desativar
- [x] Backend subscribe/unsubscribe/test
- [x] **Envio automático** via Realtime listener no backend

### Sidebar de Membros
- [x] **MemberList** — sidebar direita com membros do servidor
- [x] Agrupamento Online/Offline com indicador verde/cinza
- [x] Ordenação por nível (cargo) + nome
- [x] Ícones: Crown (owner), Shield (admin), Wrench (mod)

### Cargos Internos (per-server)
- [x] **ServerRolesDialog** — criar/editar cargos (nível 1-99, cor, permissões JSONB)
- [x] Permissões: manage_channels, manage_roles, manage_messages, kick, ban, mention_everyone, attach_files, create_threads, voice_mute, voice_deafen
- [x] Slider de nível, seletor de cor, switches de permissão

### Eventos
- [x] **ServerEventsDialog** — criar/visualizar eventos com data, descrição
- [x] Lista ordenada por data

### Stickers
- [x] `sticker_packs` + `stickers` tables (já existiam no schema)
- [x] **StickerPicker** — busca stickers do servidor, grid 4-column

## 🚀 Roadmap: v3.0.5 (Prioridade)

- Fix urgente: corrigir "0 online" nos cabeçalhos de grupos e garantir contagem via `presence` (socket auth já aplicado).
- UI: Separadores de categoria (titled separators) — editar, renomear, remover categorias.
- UX: Drag & drop de canais entre categorias e reordenação (persistir `position` + `category`).
- Discover: mostrar `banner` nos cards públicos.
- Backend: endpoint/rota para bulk update de posições (ou usar mutation via Supabase RPC).
- Iteração: permissões por categoria e otimizações de render (virtualização quando categoria grande).

- [x] Inserção como Markdown `![sticker](url)`

### Convites
- [x] **InvitesDialog** — criar convites com max usos + expiração
- [x] Copiar link do convite
- [x] Rota `/invite/$code` com função `accept_invite()` (verifica banimento, expiração, usos)

### Moderação
- [x] **ReportDialog** — reportar mensagem (spam, assédio, hate, nsfw, other)
- [x] **BanDialog** — banir membro com motivo + duração
- [x] `server_bans`, `moderation_reports`, `moderation_logs` tables

### Perfil Público
- [x] Rota `/app/profile/$userId` com avatar, banner, bio, badges, cargos
- [x] Servidores em comum (quando logado)

### Temas por Servidor
- [x] **ThemeDialog** — escolher cor principal, fundo, modo dark/light, fonte
- [x] `theme_config JSONB` column em `servers`
- [x] Fontes: padrão, Comic Neue (retrô), Arial (nostálgico), Monospace

### Níveis/Reputação
- [x] `server_xp` table com trigger `grant_xp_for_message()` (+1 XP por mensagem)
- [x] **LevelBadge** componente com níveis: Novato, Frequente, Membro, Veterano, Lenda, Panela de Ouro
- [x] Barra de progresso do próximo nível

### Infra & Schema
- [x] Migration SQL completa: `invites`, `server_bans`, `moderation_reports`, `moderation_logs`, `server_xp`
- [x] `theme_config` column em `servers`
- [x] Função `accept_invite()` com validações
- [x] Trigger `grant_xp_for_message()`
- [x] Realtime publications para `server_xp`, `server_events`
- [x] Frontend TanStack Start SSR na Vercel
- [x] Backend Node.js no Render
- [x] Rate limiting + CORS

---

## 📊 PROGRESSO TOTAL

| Categoria | Total | Feito | % |
|-----------|-------|-------|---|
| Auth & Conta | 4 | 4 | 100% |
| Perfil | 10 | 10 | 100% |
| Cargos Globais | 4 | 4 | 100% |
| PRO Subscriptions | 5 | 5 | 100% |
| Servidores | 8 | 8 | 100% |
| Canais | 4 | 4 | 100% |
| Chat Realtime | 14 | 14 | 100% |
| Voz/Vídeo | 9 | 9 | 100% |
| Push Notifications | 7 | 7 | 100% |
| Busca | 2 | 2 | 100% |
| Sidebar Membros | 4 | 4 | 100% |
| Cargos Internos | 4 | 4 | 100% |
| Threads | 3 | 3 | 100% |
| Eventos | 3 | 3 | 100% |
| Stickers | 3 | 3 | 100% |
| Moderação | 5 | 5 | 100% |
| Convites | 4 | 4 | 100% |
| Perfil Público | 3 | 3 | 100% |
| Temas por Servidor | 3 | 3 | 100% |
| Níveis/Reputação | 4 | 4 | 100% |
| Banco de Dados | 18 | 18 | 100% |
| Infra & Deploy | 6 | 6 | 100% |
| **Total** | **127** | **127** | **100%** |

---

## 💻 NOVOS ARQUIVOS CRIADOS

| Arquivo | Descrição |
|---------|-----------|
| `src/components/MemberList.tsx` | Sidebar de membros com status online/offline |
| `src/components/ServerRoles.tsx` | Dialog de gerenciamento de cargos internos |
| `src/components/ServerEvents.tsx` | Dialog de eventos do servidor |
| `src/components/Invites.tsx` | Dialog de convites com criação e cópia |
| `src/components/ModPanel.tsx` | ReportDialog + BanDialog |
| `src/components/ThemeConfig.tsx` | Dialog de tema do servidor (cores, fonte, modo) |
| `src/components/LevelBadge.tsx` | Badge de nível/reputação com progresso |
| `src/components/GifPicker.tsx` | Seletor de GIFs (Tenor API) |
| `src/components/StickerPicker.tsx` | Seletor de stickers do servidor |
| `src/routes/app/profile.$userId.tsx` | Página de perfil público |
| `src/routes/app/servers/$serverId/threads/$messageId.tsx` | Visualização de thread |
| `src/routes/invite.$code.tsx` | Aceitar convite via código |
| `supabase/migrations/20260529000000_new_tables.sql` | Migration: invites, bans, reports, logs, xp, theme_config |

## 🔧 ARQUIVOS MODIFICADOS

| Arquivo | Mudanças |
|---------|----------|
| `package.json` | Adicionado `react-markdown`, `remark-gfm`, `@tailwindcss/typography` |
| `src/styles.css` | Adicionado `@plugin "@tailwindcss/typography"`, classes retro/prose/server-theme |
| `src/routes/app/servers/$serverId.$channelId.tsx` | **Reescrito**: Markdown, infinite scroll, threads, GIF/sticker picker, profile links, video/audio preview |
| `src/routes/app/servers/$serverId.tsx` | Adicionado MemberList + dialogs (roles, events, invites, theme, ban) + socket.io presence |
| `src/routes/app/settings.tsx` | Push notifications (já estava implementado) |
| `src/components/VoiceRoom.tsx` | Grid com todos participantes, foco, fullscreen, screenshare |
| `backend/server.mjs` | Push automático via Realtime listener |

## 📋 PRÓXIMOS PASSOS (OPCIONAIS)

Estes são opcionais / diferenciais que podem ser implementados como melhoria contínua:

1. **Chat dentro da call** — mini chat no VoiceRoom quando em canal de voz
2. **PWA offline-first** — background sync, cache de mensagens recentes
3. **Painel Staff avançado** — analytics (usuários ativos, servidores, subs), relatórios CSV
4. **Sistema de "panelinhas"** — subgrupos privados dentro de servidor
5. **Tema claro** — implementação completa do tema light
6. **Packs de stickers** — UI para criar packs + upload de stickers
7. **GIF tags** ao lado do nome de membros (concedidas por cargo alto)
8. **Modo "fórum 2008"** — layout alternativo simplificado

## 🌐 ENV VARS NECESSÁRIAS

| Var | Onde | Para quê |
|-----|------|----------|
| `VITE_SUPABASE_URL` | Vercel | Conexão Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel | Auth client |
| `VITE_VAPID_PUBLIC_KEY` | Vercel | Push subscription |
| `VITE_API_URL` | Vercel | Backend API calls |
| `VITE_REALTIME_URL` | Vercel | Socket.io connection |
| `VITE_TENOR_API_KEY` | Vercel | GIF picker (Tenor) |
| `SUPABASE_URL` | Render | Backend DB |
| `SUPABASE_PUBLISHABLE_KEY` | Render | Backend auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Render | Push listener + admin ops |
| `VAPID_PUBLIC_KEY` | Render | Send push |
| `VAPID_PRIVATE_KEY` | Render | Send push |
| `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | Render | Voice rooms |
| `FRONTEND_ORIGIN` | Render | CORS |
