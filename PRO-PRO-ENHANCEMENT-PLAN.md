# Plano Avançado de Melhoria do Plano PRO

## Visão geral
Este documento descreve um plano completo para transformar o Plano PRO em um motor de retenção, engajamento e diferenciação para o produto. O objetivo é tornar o PRO irresistível para criadores, moderadores e usuários ativos, com recursos de personalização, presença e controle social.

---

## Objetivos principais

1. Melhorar a identidade visual e social do usuário.
2. Oferecer recursos exclusivos em perfil e chat.
3. Criar uma experiência PRO clara e premium dentro do app.
4. Aumentar receita e adoção com upgrade direto no perfil.
5. Construir base técnica para futuras funcionalidades pagas.

---

## Recursos PRO estratégicos

### 1. Personalização de perfil
- Avatar animado / GIF e banner customizado.
- Nome com gradiente, cores personalizadas e efeitos especiais.
- BIO estendida com suporte a rich text leve e emojis.
- Badge PRO global com visibilidade em lista de usuários e cards.
- Tema por servidor ou perfil escuro/claro custom.

### 2. Presença aumentada
- Tag PRO visível em destaque no perfil.
- Status personalizado e prático.
- Mini painel de conquistas / streaks.
- Prioridade de presença em descobertas públicas e communities.

### 3. Experiência de chat e mídia
- Upload de imagens e arquivos até 100MB.
- Upload GIFs e stickers exclusivos PRO.
- Mensagens PIN e destaque de conteúdo importante.
- Reações avançadas e emojis adicionais.

### 4. Ferramentas de criação e engajamento
- Atalhos fixos de perfil para servidores, discovery e configurações.
- Visualização de perfil em tempo real com preview.
- Mode “Showcase” para eventos e lançamentos.

### 5. Gestão e controle
- Dashboard de planos com histórico de upgrades.
- Botões de gerenciamento PRO direto da página de perfil.
- Sinalização de recursos disponíveis e bloqueados.
- Solicitação de upgrade PRO dentro da app.

---

## Arquitetura técnica

### Banco de dados
- Adicionar colunas para:
  - `avatar_url`, `banner_url`, `bio`, `status_text`
  - `name_color`, `name_colors`, `name_effect`
  - `social_links` (JSONB)
  - `current_plan`, `plan_started_at`, `plan_expires_at`
- Garantir RLS para perfis e armazenamento seguro de uploads.

### Armazenamento de mídia
- Usar buckets específicos para `avatars` e `banners`.
- Gerar URLs públicos e expirados apenas quando necessário.
- Aceitar GIFs e arquivos maiores apenas para usuários PRO.

### Backend / fluxo
- Hooks de perfil atualizados em `useAuth` e `useServerQueries`.
- Endpoint de atualização de perfil com validação de plano.
- Integração com página de pagamentos / pedidos se existir.

### Frontend
- `app/profile`: central do PRO, preview e gerenciamento.
- `app/plans`: comparativo de planos mais robusto.
- `discover`: destaque de badges PRO e servidores com recursos avançados.
- Componentes de perfil reutilizáveis com suporte a efeitos visuais.

---

## Roadmap de implementação

### Fase 1: UX e perfil PRO
- Redesenhar `app/profile` como painel central.
- Criar preview de perfil com banner e avatar.
- Adicionar seção de upgrade e benefícios PRO.
- Converter recursos existentes para fluxo PRO.

### Fase 2: Personalização visual
- Implementar gradientes e efeitos no nome.
- Habilitar upload de avatar/banner e preview.
- Construir feedback visual de status PRO.

### Fase 3: Recursos de chat e mídia
- Habilitar upload PRO de GIF e arquivos maiores.
- Adicionar stickers e reações PRO.
- Criar categoria de recursos bloqueados e desbloqueados.

### Fase 4: Crescimento e retenção
- Desenvolver onboarding PRO no perfil.
- Criar campanha de descoberta para usuários ativos.
- Monitorar conversões e ajustar benefícios.

---

## Métricas e sinais de sucesso

- Aumento de upgrades PRO dentro do app.
- Adoção de recursos de customização e uploads.
- Retenção superior dos usuários PRO.
- Tempo médio gasto na página de perfil.
- Taxa de clique em calls-to-action PRO.

---

## Conclusão
O Plano PRO deve ser construído como um hub de personalidade e potência, não apenas um plano pago. A página de perfil é o ponto natural para conectar o usuário ao upgrade: ela combina identidade, customização e controle.

Com um roadmap técnico claro e uma interface de gerenciamento bem desenhada, vamos transformar o PRO em uma experiência premium consistente e desejável.
