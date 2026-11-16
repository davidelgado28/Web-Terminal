# Web Terminal

Terminal Linux real, acessível pelo navegador. Cada usuário recebe um
container Docker isolado e descartável, com shell bash completo.

![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)
![Docker](https://img.shields.io/badge/docker-required-blue)

## Funcionalidades

- **Shell bash real** — não é emulação, é Linux de verdade
- **Sandbox isolado** — cada sessão roda em container próprio
- **Terminal 256 cores** — com xterm.js (mesma lib do VS Code)
- **Auto-destruição** — sessões expiram após inatividade
- **Rate limiting** — limite de sessões simultâneas por IP
- **Hardening de segurança** — sem rede, sem privilégios, recursos limitados
- **Graceful shutdown** — containers limpos ao parar o servidor
- **Cronômetro de sessão** — tempo decorrido visível no header

## Arquitetura

```
┌──────────────┐   WebSocket    ┌─────────────────┐   Docker API   ┌────────────┐
│   Browser    │ ◄────────────► │  Node.js Server │ ◄────────────► │  Container │
│  (xterm.js)  │   bidirecional │  (Express + WS) │  exec / hijack │  (Ubuntu)  │
└──────────────┘                └─────────────────┘                └────────────┘
```

| Componente | Tecnologia | Função |
|---|---|---|
| Frontend | xterm.js 5.x | Emulação de terminal no navegador |
| Transporte | WebSocket (ws) | Streaming bidirecional de I/O |
| Backend | Node.js + Express | Sessões, rotas, limpeza |
| Sandbox | Docker (dockerode) | Isolamento por container |
| Base | Ubuntu 24.04 | Imagem com bash, gcc, python3, git... |

## Estrutura do Projeto

```
web-terminal/
├── docker-compose.yml          # Orquestração
├── Dockerfile                  # Imagem do servidor
├── package.json
├── .env.example                # Variáveis de ambiente (exemplo)
├── .gitignore
├── README.md
├── src/
│   ├── server.js               # Entry point + graceful shutdown
│   ├── config.js               # Config via env vars
│   ├── session/
│   │   ├── Session.js          # Sessão individual (stream + timeout)
│   │   └── SessionManager.js   # Pool de sessões + limite por IP
│   ├── routes/
│   │   └── terminal.js         # Rotas HTTP + WebSocket
│   ├── middleware/
│   │   ├── rateLimit.js        # 429 se IP exceder limite
│   │   └── cleanup.js          # Loop de limpeza de órfãos
│   └── docker/
│       └── DockerSandbox.js    # Criação/remoção de containers
├── public/
│   ├── index.html
│   ├── css/
│   │   └── terminal.css
│   └── js/
│       └── terminal.js         # Cliente xterm.js
└── sandbox-image/
    └── Dockerfile              # Imagem dos containers de usuário
```

## Início Rápido

### Pré-requisitos

- **Docker** instalado e rodando
- **Node.js ≥ 18** (se rodar sem compose)

### 1. Clone e instale

```bash
git clone https://github.com/seu-usuario/web-terminal.git
cd web-terminal
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edite .env se necessário (padrões funcionam para dev)
```

### 3. Construa a imagem do sandbox

```bash
docker build -t web-terminal-sandbox:latest -f sandbox-image/Dockerfile sandbox-image/
```

### 4. Rode

**Com Docker Compose (recomendado):**

```bash
docker compose up --build
```

**Ou direto com Node:**

```bash
node src/server.js
```

### 5. Acesse

Abra [http://localhost:3000](http://localhost:3000) 🎉

## Configuração

Todas as opções via variáveis de ambiente (`.env`):

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3000` | Porta do servidor HTTP/WS |
| `SESSION_TIMEOUT_MINUTES` | `30` | Minutos de inatividade antes de destruir a sessão |
| `MAX_SESSIONS_PER_IP` | `2` | Sessões simultâneas permitidas por IP |
| `CONTAINER_IMAGE` | `web-terminal-sandbox:latest` | Imagem usada nos sandboxes |
| `CONTAINER_MEMORY_MB` | `256` | RAM máxima por container |
| `CONTAINER_CPUS` | `0.5` | CPUs por container |
| `CONTAINER_TIMEOUT_SECONDS` | `1800` | Idle timeout do container (30 min) |

## Uso

| Ação | Como |
|---|---|
| Nova sessão | Botão **"Nova sessão"** ou `Ctrl+Shift+N` |
| Copiar | Selecionar texto (auto-copia no xterm.js) |
| Colar | `Ctrl+Shift+V` ou botão direito |
| Sair do shell | `exit` — encerra a sessão |
| Ver sessões ativas | `GET /health` → `{"activeSessions": N}` |

### Comandos disponíveis no sandbox

O sandbox Ubuntu 24.04 vem com:

`bash` `python3` `gcc` `make` `git` `vim` `nano` `curl` `wget` `htop` `tmux`

## Segurança

### Medidas implementadas

| Medida | Config |
|---|---|
| Sem capabilities | `CapDrop: ['ALL']` |
| Sem escalada de privilégio | `no-new-privileges` |
| Usuário não-root | `USER sandbox` |
| Sem rede | `NetworkMode: 'none'` |
| Limite de RAM | `Memory: 256MB` (sem swap) |
| Limite de CPU | `NanoCpus: 0.5` |
| Anti fork-bomb | `PidsLimit: 100` |
| `/tmp` isolado | tmpfs `noexec,nosuid` |
| Auto-destruição | Timeout de inatividade |
| Rate limit por IP | `MAX_SESSIONS_PER_IP` |
| Cleanup de órfãos | Loop a cada 5 min + no boot |

## Desenvolvimento

### Modo watch

```bash
npm run dev
```

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Página do terminal |
| `GET` | `/health` | Status das sessões |
| `WS` | `/ws` | Conexão do terminal |

### Protocolo WebSocket

**Cliente → Servidor:**

```json
{"type": "input", "data": "ls\n"}
{"type": "resize", "cols": 120, "rows": 30}
```

**Servidor → Cliente:**

```json
{"type": "session", "id": "uuid-aqui"}
```

Saída do shell é enviada como **texto puro** (não JSON).

### Limpando containers órfãos manualmente

```bash
docker ps -a --filter label=webterm.session -q | xargs -r docker rm -f
```

## Roadmap

- [ ] Reconexão automática (sessão sobrevive a refresh)
- [ ] Múltiplas abas
- [ ] Upload de arquivos para o sandbox
- [ ] Download de arquivos do sandbox
- [ ] Autenticação com login
- [ ] Escolha de imagem (Ubuntu, Alpine, Arch...)
- [ ] Suporte a tmux persistente no servidor
