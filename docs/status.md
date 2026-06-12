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
| `langfuse-proxy` | migrado      | —     | **Fase 2** — 19 rotas espelhando o legado, 3 use cases (`WriteScore`, `CreatePrompt`, `CreateScoreConfig`), DTOs com `class-validator`, `taxonomy` (`buildPromptName`, `buildScoreConfigName`) em `shared/domain/services/`. Validado em Docker 2026-06-10 (6 curls: health, proxy, query, DTO 400, taxonomy, wildcard). |
| `agents`         | migrado      | —     | **Fase 3** — `RegisterAgent` (upsert idempotente tenant→system→agent) + `ProcessHeartbeat` (recalcula status via `status-engine`, persiste CBs best-effort). 6 rotas (`POST /agents/register`, `POST /agents/:slug/heartbeat`, `GET /agents`, `GET /agents/:slug`, `GET /agents/:slug/status`, `GET /agents/:slug/circuit-breakers`). Migration `init_agents` (Tenant, System, Agent, CircuitBreakerState, CircuitBreakerTransition). Validado em Docker 2026-06-12. |
| `intelligence`   | não iniciado | —     | Fase 4 — depende de `agents`.                                                                   |
| `slos`           | não iniciado | —     | Fase 5 — depende de `agents`.                                                                   |
| `observations`   | não iniciado | —     | Fase 6 — depende de `agents`.                                                                   |

**Status possíveis:** `não iniciado` · `em andamento` · `migrado` · `descartado`

---

## Shared

| Pacote `shared/`  | Status       | Notas                                                                                                                                                               |
| ----------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`          | migrado      | `@Global` — `@nestjs/config` + `validateEnv`. Envs registradas: `databaseUrl`, `langfuseBaseUrl`, `langfusePublicKey`, `langfuseSecretKey`, `observatoryApiKey`. `ValidationPipe` global registrado via `APP_PIPE` em `app.module.ts` (Fase 2). |
| `prisma`          | migrado      | `@Global` — `PrismaService` com adapter PG (Prisma 7). `pingPool` dedicado pra health check. Schema com model `AuditLog` (migration `20260610000650_init_audit_log` aplicada). |
| `auth`            | migrado      | `@Global` `ApiKeyGuard` registrado como `APP_GUARD`. `@Public()` decorator pra exceções. `timingSafeEqual` na comparação. Validado em 2026-06-09. |
| `http`            | migrado      | `DomainExceptionFilter` global via `APP_FILTER` mapeando `DomainError` → status code via `httpStatus`. |
| `domain`          | em andamento | Entities `Tenant`, `System`, `Agent` + VOs `AuditLogEntry`, `AgentStatus`, `CircuitBreakerState`, `CircuitBreakerTransition` + errors (`DomainError`, `DomainNotFoundError`, `DomainConflictError`, `DomainValidationError`) + services `taxonomy` + `status-engine` (compute_status com 4 testes property-based). Faltam `SLO`, `HealthScore`. |
| `repositories`    | em andamento | `@Global` `RepositoriesModule` — binds `IAuditLogRepo`, `IAgentRepo`, `ICircuitBreakerRepo` + mappers. Faltam `ISLORepo`, `ISnapshotRepo`, `IHealthScoreRepo`. |
| `langfuse-client` | migrado      | `@Global` — `LangfuseHttpClient` com `fetch` nativo + Basic Auth. 19 métodos cobrindo todos os endpoints do adapter Python. Validado em 2026-06-10 (proxy real respondendo). |

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
