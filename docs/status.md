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
| `config`          | em andamento | `@Global` — `@nestjs/config` + `validateEnv`. Apenas `databaseUrl` e `langfuseBaseUrl` registrados; faltam outras envs (LANGFUSE_PUBLIC_KEY, OBSERVATORY_API_KEY, etc.). ValidationPipe global ainda não registrado. |
| `prisma`          | em andamento | `@Global` — `PrismaService` com adapter PG (Prisma 7). Inclui `pingPool` dedicado pra health check. Falta: schema Prisma com tabelas reais.                          |
| `auth`            | não iniciado | `@Global` — `ApiKeyGuard`                                                                                                                                           |
| `http`            | não iniciado | filtro de exceção, interceptor de log                                                                                                                               |
| `domain`          | não iniciado | vocabulário do projeto: `Agent`, `Tenant`, `System`, `SLO`, `HealthScore`, `AgentStatus`, etc. + classes base de erro                                               |
| `repositories`    | não iniciado | `@Global` `RepositoriesModule` — implementações + abstract classes (`IAgentRepo`, `ISnapshotRepo`, `ISLORepo`, `IHealthScoreRepo`, `IAuditLogRepo`, etc.) + mappers |
| `langfuse-client` | em andamento | `@Global` — `LangfuseHttpClient` com `fetch` nativo. Apenas `getHealth()` implementado; outros métodos virão na Fase 2 (langfuse-proxy).                           |

---

## Infra e configuração

| Item legado (`../pulso/`)         | Destino (`pulso-js/`)             | Status       | Notas                                                                                                                                                                         |
| --------------------------------- | --------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker/Dockerfile`               | `docker/Dockerfile`               | não iniciado | Reescrito do zero: multi-stage Node 22 + pnpm (substitui Python/uv).                                                                                                          |
| `docker/docker-compose.yml`       | `docker/docker-compose.yml`       | não iniciado | **Estratégia A**: compose próprio, sobe só `pulso-js` e conecta na rede externa do compose do legado pra usar `langfuse-web` e `observatory-postgres` durante a coexistência. |
| `docker/init-agent-databases.sql` | `docker/init-agent-databases.sql` | não iniciado | Banco dos agentes externos (LangGraph) que mandam heartbeat pro pulso. Migra como está — o `pulso-js` precisa subir esse banco em dev local pra o ecossistema funcionar.      |
| `entrypoint.sh`                   | `entrypoint.sh` ou descartar      | não iniciado | Decisão durante migração: ou adapta pra Node (`node dist/main.js` + `prisma migrate`), ou descarta e usa `CMD` direto no Dockerfile. Decidir junto com Dockerfile.            |
| `.env.example`                    | `.env.example`                    | não iniciado | Envs esperadas pelo app rodando local (sem Docker).                                                                                                                           |
| `.env.docker.example`             | `.env.docker.example`             | não iniciado | Envs específicas do compose (passwords de Postgres, MinIO, ClickHouse, etc).                                                                                                  |
| `.dockerignore`                   | `.dockerignore`                   | não iniciado | Adaptado: ignora `node_modules`, `dist`, `coverage` em vez dos paths Python.                                                                                                  |
