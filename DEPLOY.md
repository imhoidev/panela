# Deploy do PANELA — Render (fullstack) + Vercel (redirect)

Arquitetura escolhida: **TanStack Start fullstack roda no Render** (SSR + API + Socket.io na mesma porta). O **Vercel** serve apenas como redirect/atalho de domínio.

---

## 1. Deploy no Render (backend + frontend SSR)

### a) Conectar o repositório
1. Crie uma conta em https://render.com
2. **New +** → **Blueprint** → conecte o GitHub e selecione o repo do PANELA
3. O Render detecta o arquivo `render.yaml` automaticamente e cria o serviço **panela-app**

### b) Variáveis de ambiente
No painel do serviço, em **Environment**, configure (todas marcadas como `sync: false`):

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | https://morhgtznnxafrcoclqmr.supabase.co |
| `SUPABASE_PUBLISHABLE_KEY` | (anon key — veja `.env`) |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role do Supabase) |
| `VITE_SUPABASE_URL` | mesma do `SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | mesma do `SUPABASE_PUBLISHABLE_KEY` |
| `VITE_SUPABASE_PROJECT_ID` | morhgtznnxafrcoclqmr |
| `LIVEKIT_URL` | wss://… (do seu projeto LiveKit) |
| `LIVEKIT_API_KEY` | … |
| `LIVEKIT_API_SECRET` | … |
| `FRONTEND_ORIGIN` | https://panela.vercel.app (seu domínio do Vercel) |

> As `VITE_*` precisam estar presentes no build — o Vite as injeta no bundle do client.

### c) Build & Start
Já vem do `render.yaml`:
- **Build**: `npm install && NITRO_PRESET=node-server npm run build`
- **Start**: `node render/server.node.mjs`
- **Health check**: `/health`

A URL final fica algo como `https://panela-app.onrender.com`.

---

## 2. Deploy no Vercel (redirect)

1. https://vercel.com → **Add New Project** → importe o mesmo repo
2. Framework Preset: **Other** (nenhum build necessário)
3. **Build Command**: deixe vazio (`echo skip`)
4. **Output Directory**: deixe vazio
5. Confirme o deploy

O arquivo `vercel.json` faz redirect 307 de qualquer rota para o Render:

```json
{ "redirects": [{ "source": "/:path*", "destination": "https://panela-app.onrender.com/:path*" }] }
```

> ⚠️ **Atualize o domínio** em `vercel.json` se a sua URL do Render for diferente de `panela-app.onrender.com`.

---

## 3. Realtime (Socket.io)

- O servidor sobe na **mesma porta** do app (path `/realtime`) — não precisa de outro serviço.
- No client, use `getSocket(userId)` de `src/lib/socket.ts`.
- Se quiser separar domínios, defina `VITE_REALTIME_URL=https://panela-app.onrender.com` no build do Render.

Eventos disponíveis:
- `channel:join` / `channel:leave` — entrar/sair de rooms
- `typing:start` / `typing:stop` — indicadores de digitação
- `presence:set` (online | idle | dnd | invisible)
- `presence:update` (broadcast)

---

## 4. Custom domain (opcional)

- Aponte seu domínio para o **Render** diretamente (recomendado, sem o hop do redirect).
- OU mantenha no Vercel se quiser usar a CDN/edge dele só pro redirect.

---

## Resumo

| Camada | Host | URL |
|---|---|---|
| Frontend SSR + API + WebSocket | Render | `panela-app.onrender.com` |
| Domínio público (redirect) | Vercel | `panela.vercel.app` |
| Banco/Auth/Storage | Supabase | gerenciado |
| Voz/Vídeo | LiveKit Cloud | gerenciado |
