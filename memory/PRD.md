# Digital Store — PRD

## Problema
Sistema monolítico full-stack para venda de produtos digitais (ativações e créditos), com painel administrativo completo, PIX via Mercado Pago e WhatsApp Baileys.

## Stack (adaptado)
- Backend: FastAPI (Python) + Motor (MongoDB)
- Frontend: React (CRA/Craco) + Zustand + TanStack Query + Tailwind + shadcn/ui
- Sidecar: Node.js + Baileys para WhatsApp (rodando sob supervisor na porta 3001)
- Pagamentos: Mercado Pago SDK oficial (PIX)

## Personas
1. Cliente final — compra ativação ou créditos, recebe entrega automática via PIX.
2. Super Admin / Admin / Financeiro / Suporte / Operador — RBAC.

## Implementado (2026-07-22)
- Autenticação por CPF + senha, JWT + Refresh Token
- Recuperação de senha via WhatsApp/Email (token)
- Cadastro/registro de usuários com validação de CPF, telefone único, senha forte
- Painel do usuário: dashboard, pedidos, perfil, notificações, favoritos, suporte (tickets)
- Loja: pesquisa/filtros/ordenação/categorias
- Detalhes do produto com campos personalizados dinâmicos e quantidades para créditos com desconto por volume
- Carrinho inteligente com regras (ativação única, não misturar categorias, créditos múltiplos)
- Checkout com PIX real via Mercado Pago (QR + copia e cola) + polling automático de status
- Pedidos com auto-entrega ao aprovar pagamento
- Cupons (percent/fixed/1ª compra) — validação server-side
- Promoções com contador regressivo
- Banners (principal/promo/lateral/popup/slider)
- Sistema de notificações (in-app)
- Painel Administrativo completo:
  - Dashboard com KPIs e gráficos (Recharts)
  - CRUD Produtos com campos personalizados e volume discount
  - CRUD Categorias, Cupons, Promoções, Banners
  - Gestão de Pedidos (filtro, status, export CSV)
  - Gestão de Usuários (bloquear, resetar senha)
  - WhatsApp Baileys: sessões múltiplas, QR real, restart/logout, envio de teste, templates
  - Financeiro (dia/semana/mês/ano + best-sellers)
  - Configurações (SEO, empresa, redes, MP public key)
  - Logs & Auditoria
  - Tickets (suporte)
- Health endpoints: /api/health, /api/ready, /api/live
- Templates de mensagens WhatsApp com variáveis {nome} {cpf} {produto} {valor} {pedido} {pix} {status} {token}
- Envio automático de WhatsApp em eventos: welcome, pix_generated, payment_approved, order_delivered, password_reset

## Backlog / Próximos passos (P1)
- Upload real por painel (frontend) — endpoint /api/uploads/image já existe
- Templates de email + SMTP
- Backup/restore automático pelo painel
- Auditoria detalhada (before/after)
- CI/CD GitHub Actions
- Docker multi-stage e Northflank deploy
- Testes automatizados unitários

## Credenciais padrão
Ver /app/memory/test_credentials.md
