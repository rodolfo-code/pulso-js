# Status — Pulso JS

**Fase atual:** `travessia`

<!--
Valores: `travessia` | `produção`.
Trocar pra `produção` quando todos os itens das tabelas abaixo estiverem
`migrado` ou `descartado`. Quando a fase virar `produção`, o `../pulso/`
(legado Python) pode ser descontinuado.
-->

---

## Módulos

| Módulo           | Status       | Plano | Notas                                                                                           |
| ---------------- | ------------ | ----- | ----------------------------------------------------------------------------------------------- |
| `health`         | migrado      | [`plans/health.md`](../plans/health.md) | **Fase 1** — primeiro a migrar. Pequeno e independente; serviu como spike pra validar o harness. |
| `langfuse-proxy` | não iniciado | —     | Fase 2 — sem dependências de outros módulos.                                                    |
| `agents`         | não iniciado | —     | Fase 3 — fundação dos demais.                                                                   |
| `intelligence`   | não iniciado | —     | Fase 4 — depende de `agents`.                                                                   |
| `slos`           | não iniciado | —     | Fase 5 — depende de `agents`.                                                                   |
| `observations`   | não iniciado | —     | Fase 6 — depende de `agents`.                                                                   |

**Status possíveis:** `não iniciado` · `em andamento` · `migrado` · `descartado`

---

## Shared

| Pacote `shared/`  | Status       | Notas                                                                                                                                                               |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`          | em andamento | `@Global` — `@nestjs/config` + `validateEnv`. Envs registradas: `databaseUrl`, `langfuseBaseUrl`, `observatoryApiKey`. Faltam `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` (Fase 2). ValidationPipe global ainda não registrado. |
| `prisma`          | em andamento | `@Global` — `PrismaService` com adapter PG (Prisma 7). Inclui `pingPool` dedicado pra health check. Falta: schema Prisma com tabelas reais.                          |
| `auth`            | migrado      | `@Global` `ApiKeyGuard` registrado como `APP_GUARD`. `@Public()` decorator pra exceções (já aplicado em `HealthController`). `timingSafeEqual` na comparação. Validado em 2026-06-09 (200 OK em rota pública, e2e cobre rotas protegidas). |
| `http`            | não iniciado | filtro de exceção, interceptor de log                                                                                                                               |
| `domain`          | não iniciado | vocabulário do projeto: `Agent`, `Tenant`, `System`, `SLO`, `HealthScore`, `AgentStatus`, etc. + classes base de erro                                               |
| `repositories`    | não iniciado | `@Global` `RepositoriesModule` — implementações + abstract classes (`IAgentRepo`, `ISnapshotRepo`, `ISLORepo`, `IHealthScoreRepo`, `IAuditLogRepo`, etc.) + mappers |
| `langfuse-client` | em andamento | `@Global` — `LangfuseHttpClient` com `fetch` nativo. Apenas `getHealth()` implementado; outros métodos virão na Fase 2 (langfuse-proxy).                           |

---

## Infra e configuração

| Item legado (`../pulso/`)         | Destino (`pulso-js/`)             | Status       | Notas                                                                                                                                                                         |
| --------------------------------- | --------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker/Dockerfile`               | `docker/Dockerfile`               | migrado      | Multi-stage Node 22 + pnpm + SWC. Validado em 2026-06-09 (`pnpm docker:up` → `GET /health` retornou 200 OK ponta-a-ponta).                                                    |
| `docker/docker-compose.yml`       | `docker/docker-compose.yml`       | migrado      | Compose **standalone**: sobe a stack inteira (Langfuse + bancos + pulso-js), igual o legado fazia. Validado em 2026-06-09. Durante a coexistência, subir só um dos dois (legado OU pulso-js) por vez — conflitam em portas e volumes. |
| `docker/init-agent-databases.sql` | `docker/init-agent-databases.sql` | migrado      | Cópia direta do legado. Banco dos agentes externos (LangGraph) sobe junto no compose.                                                                                         |
| `entrypoint.sh`                   | `entrypoint.sh`                   | migrado      | Adaptado para Node: condicional que pula `prisma migrate deploy` quando `prisma/migrations/` não existe, depois `exec node dist/src/main.js`.                                |
| `.env.example`                    | `.env.example`                    | migrado      | Lista as envs esperadas pelo `validateEnv`. Único `.env` (sem `.env.docker` separado — decidido em 2026-06-08).                                                              |
| `.env.docker.example`             | —                                 | descartado   | Decidido em 2026-06-08: ter `.env` único na raiz que serve tanto `pnpm dev` quanto Docker. Compose lê `.env` via `--env-file .env` (encapsulado em `pnpm docker:up`).        |
| `.dockerignore`                   | `.dockerignore`                   | migrado      | Adaptado: ignora `node_modules`, `dist`, `coverage`, `src/generated`, `.env`, testes, docs.                                                                                   |
