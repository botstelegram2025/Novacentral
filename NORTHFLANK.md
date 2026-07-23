# Deploy no Northflank — MARKIMAGEM TV

Este projeto foi preparado para ser implantado como **um único serviço** no Northflank.
Um container roda ao mesmo tempo: FastAPI (backend + frontend estático) na porta 8001 + Baileys sidecar (Node.js) na porta 3001 (interna).

---

## 1. Pré-requisitos

- Conta no Northflank e o projeto criado (você já tem "loja virtual").
- Repositório no GitHub conectado ao Northflank: `botstelegram2025/Novacentral`.
- MongoDB acessível pelo Northflank. Duas opções:
  - **(recomendado)** Criar um **Addon → MongoDB** no mesmo projeto.
  - Ou usar MongoDB Atlas / outro provedor externo.

---

## 2. Criar o Addon MongoDB (recomendado)

1. No projeto, clique em **Create new → Addon**.
2. Escolha **MongoDB**.
3. Nome: `mongo`. Plano: o menor disponível.
4. Após criado, abra o addon e copie o valor de **`MONGO_URL`** (ou "Connection string"). Você vai colar isso mais tarde nas variáveis do serviço.

---

## 3. Configurar o Service (a tela onde você está)

### Basic information
- **Service name:** `markimagem-app`
- **Environment:** (deixe padrão)

### Source
- **Combined** (Build and deploy a Git repo) ✅
- **Repository:** `botstelegram2025/Novacentral`
- **Branch:** `main`

### Build options
- **Build type:** Dockerfile ✅
- **BuildKit:** ativado (sugerido) ✅
- **Build context:** `/`     ← barra sozinha (raiz do repositório)
- **Dockerfile location:** `/Dockerfile`     ← arquivo Dockerfile na raiz (já foi criado neste projeto)
- **CI:** Enable CI ✅ (para redeploy automático a cada `git push`)

> Você tinha configurado `/Dockerfile.backend` — **troque para `/Dockerfile`**, pois criamos um `Dockerfile` multi-stage na raiz que builda backend + frontend + baileys juntos.

### Resources
- Plano mínimo recomendado: **`nf-compute-20`** (0.2 vCPU / 512 MB) para testes.
- Recomendado para produção: **`nf-compute-50`** (0.5 vCPU / 1 GB) ou superior, pois o Baileys mantém sessão WebSocket ativa e o FastAPI faz polling do Mercado Pago.
- **Instances:** 1 (o Baileys guarda sessão em disco no container — não escale horizontalmente sem antes migrar as sessões para storage externo).

### Networking
Clique em **Add port**:
- **Port:** `8001`
- **Protocol:** `HTTP`
- **Public:** ✅ (para expor externamente)
- **Domain:** o Northflank gera um `.code.run` automático. Depois você pode adicionar seu domínio.

> Não exponha a porta 3001 (Baileys é interno).

### Environment variables (Runtime)
Cole cada uma clicando em "Add variable" (deixe **Runtime** selecionado, não Build):

| Key | Value |
|---|---|
| `PORT` | `8001` |
| `MONGO_URL` | (do addon Mongo — botão "Reference" e escolha o addon) |
| `DB_NAME` | `markimagem` |
| `APP_NAME` | `MARKIMAGEM TV` |
| `CORS_ORIGINS` | `*` (ou o seu domínio) |
| `JWT_SECRET` | (string aleatória de 32+ chars — gere no [pwgen](https://passwordsgenerator.net/)) |
| `JWT_REFRESH_SECRET` | (outra string aleatória de 32+ chars) |
| `JWT_ACCESS_MINUTES` | `60` |
| `JWT_REFRESH_DAYS` | `7` |
| `ADMIN_CPF` | `00000000000` (troque para o seu CPF real depois) |
| `ADMIN_PASSWORD` | `Admin@123` (troque IMEDIATAMENTE após primeiro login) |
| `ADMIN_NAME` | `Super Admin` |
| `MERCADOPAGO_ACCESS_TOKEN` | seu access token do Mercado Pago |
| `MERCADOPAGO_PUBLIC_KEY` | sua public key do Mercado Pago |
| `WHATSAPP_WEBHOOK_TOKEN` | (string aleatória, usada só internamente) |
| `UPLOAD_PATH` | `/app/backend/uploads` |

**Build arguments** (opcional): deixe `REACT_APP_BACKEND_URL` **vazio** — o frontend chamará `/api` na mesma origem, é o comportamento correto para um monolito.

### Advanced → Health checks
Adicione:
- **Path:** `/api/health`
- **Port:** `8001`
- Protocol: HTTP
- Interval: 30s

E readiness/liveness (opcional):
- Ready: `/api/ready`
- Live: `/api/live`

### Advanced → Persistent volumes (recomendado)
Para não perder sessões do WhatsApp e uploads quando o container reiniciar, adicione dois volumes:

| Mount path | Size |
|---|---|
| `/app/whatsapp-sidecar/sessions` | 1 GB |
| `/app/backend/uploads` | 5 GB |

> Sem isso, o WhatsApp pede QR de novo a cada deploy e as imagens uploaded somem.

---

## 4. Deploy

1. Clique em **Create service**.
2. Acompanhe o build (~3–5 minutos primeira vez).
3. Quando ficar "Running", abra o domínio público (`https://markimagem-app-xxxx.code.run`).
4. Login administrativo em `/admin/login` com CPF `00000000000` / senha `Admin@123`.
5. **Troque a senha do admin imediatamente** em `/painel/perfil` (após criar um usuário admin) ou via env `ADMIN_PASSWORD` + redeploy.

---

## 5. Configurar WhatsApp (Baileys)

1. Depois que o serviço estiver rodando, entre em `/admin/whatsapp`.
2. Digite um ID para a sessão (ex: `main`) e clique em **Iniciar sessão**.
3. O QR Code aparece na tela — escaneie com o WhatsApp do celular (Aparelhos conectados → Conectar aparelho).
4. Se você não configurou volume persistente, o QR precisará ser reescaneado a cada redeploy.

---

## 6. Configurar Mercado Pago Webhook

No painel do Mercado Pago, aponte o webhook de pagamentos para:

```
https://SEU-DOMINIO.code.run/api/orders/webhook/mercadopago
```

O sistema detecta automaticamente pagamentos aprovados e libera o pedido.

---

## 7. Rodar localmente (opcional)

```bash
git clone https://github.com/botstelegram2025/Novacentral
cd Novacentral
cp .env.example .env  # edite conforme necessário
docker compose up --build
# acesse http://localhost:8001
```

---

## 8. Estrutura de arquivos (referência)

```
/app
├── Dockerfile              ← multi-stage: frontend + baileys + python
├── docker-compose.yml      ← ambiente local com Mongo
├── .dockerignore
├── .env.example
├── scripts/
│   └── supervisord.conf    ← inicia backend + baileys juntos
├── backend/                ← FastAPI (Python)
├── frontend/               ← React (CRA)
└── whatsapp-sidecar/       ← Node.js (Baileys)
```

---

## 9. Troubleshooting

- **Build falhou por memória:** aumente o plano de build no Northflank (ele exige >= 1 GB de RAM para o `yarn build`).
- **Frontend abre mas API dá 404:** confirme que `PORT=8001` e a porta pública mapeia 8001.
- **Mongo Connection refused:** verifique se `MONGO_URL` referencia o addon corretamente (use o botão "Reference secret" no Northflank).
- **WhatsApp reconecta em loop:** provavelmente sem volume persistente para `/app/whatsapp-sidecar/sessions`. Adicione o volume.
- **Health check falhando:** confirme que o path é `/api/health` e não `/health`.
- **CORS bloqueando:** ajuste `CORS_ORIGINS` para o seu domínio (ex: `https://loja.meudominio.com`).

Pronto! 🚀
