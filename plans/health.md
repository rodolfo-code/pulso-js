# Plano — `health`

> Cópia preenchida de `docs/module-template.md`. Mora em `plans/health.md`.

---

## 1. Origem no legado

- [x] `pulso/src/infrastructure/routers/health.py` — endpoint `GET /health`, lógica de degradação.
- [x] `pulso/src/infrastructure/adapters/langfuse_client.py` (linhas 65–72) — método `get_health()` que pinga `/api/public/health` do Langfuse.
- [x] `pulso/src/infrastructure/db.py` — `get_db()` que entrega `AsyncSession` para o health checar Postgres via `SELECT 1`.

---

## 2. Contrato preservado

- **Assinatura HTTP**:
  - `GET /health` — sem auth (rota pública).
  - Resposta JSON: `{ status, dependencies: { postgresql, langfuse }, timestamp }`.
  - Status codes:
    - `200` + `"status": "ok"` → pg ok + lf ok
    - `200` + `"status": "degraded"` → pg ok + lf down
    - `503` + `"status": "unavailable"` → pg down (independente do lf)
- **Invariantes**:
  - Pg down sempre 503, mesmo com Langfuse ok.
  - Langfuse down NUNCA retorna erro — só rebaixa status para `degraded`.
  - `timestamp` em ISO 8601 UTC.

---

## 3. Delta declarado

- **De**: FastAPI `APIRouter` + `Depends(get_db, get_langfuse_adapter)`.
  **Para**: NestJS `@Controller('/health')` + DI via `abstract class` (`ILangfuseClient`) + `PrismaService`.
- **De**: SQLAlchemy `session.execute(text("SELECT 1"))`.
  **Para**: Prisma `prisma.$queryRaw\`SELECT 1\``.
- **De**: Captura genérica `except Exception`.
  **Para**: try/catch envolvendo cada check, com log estruturado.
- **De**: `logging.getLogger` do Python.
  **Para**: `Logger` nativo do NestJS.

(Borda HTTP já estava em camelCase no legado — sem renomeação de campo.)

---

## 4. Critérios de aceite

- [ ] **Unit**: `CheckSystemHealthUseCase` testado com fakes de `PrismaService` e `ILangfuseClient` cobrindo 3 cenários (ok / degraded / unavailable).
- [ ] **E2E**: `GET /health` testado com:
  - Tudo ok → 200 `"ok"`
  - Langfuse fora → 200 `"degraded"`
  - Postgres fora → 503 `"unavailable"`
- [ ] **Paridade**: JSON estrutural simples, sem fixture do Python — comparação direta com os 3 contratos acima.

---

## 5. Checklist de invariantes (`GOLDEN_RULES.md`)

(Preencher antes de fechar o PR.)

---

## 6. Notas de migração

- **Spike — primeiro módulo da travessia.** Serve pra validar todo o harness.
- **Auth/`@Public` não é necessário neste spike.** Como o `ApiKeyGuard` global ainda não foi instalado, todas as rotas são públicas por default. Quando `shared/auth/` for ativado, este controller vai precisar de `@Public()`.
- `shared/config/` vai começar minimal — só `DATABASE_URL` e `LANGFUSE_BASE_URL`. Mais envs entram conforme outros módulos consomem.
- `shared/langfuse-client/` vai começar com só `getHealth()` — outros métodos virão na Fase 2 (langfuse-proxy).

---

## 7. Encerramento (checklist)

- [x] Atualizar `docs/status.md` → `health` como `migrado`, shared parciais como `em andamento`.
- [x] Atualizar coluna `Plano` em `docs/status.md` apontando pra este arquivo.
- [x] Revisão crítica do harness (seção 8).

---

## 8. Reflexão crítica do harness (spike)

Sete pontos de fricção que surgiram durante a migração. Cada um vira insumo pro próximo módulo.

### 8.1 Imports `.js` em arquivo `.ts` (config inicial era NodeNext)

Default inicial era `module: "NodeNext"` + `moduleResolution: "NodeNext"` (vindo da exigência ESM do Prisma 7). Isso obriga extensão `.js` em todo import relativo dentro do código TS — fricção visível, anti-ergonômica. Trocamos pra `module: "ESNext"` + `moduleResolution: "Bundler"` + SWC builder no Nest CLI + `.swcrc` com `resolveFully: true`.

**Ação pro próximo módulo:** já está resolvido em config. Não deve voltar a aparecer. Documentar em `docs/conventions.md` que **nunca usar `NodeNext`** mesmo com ESM.

### 8.2 `$queryRaw`/`$queryRawUnsafe` no Prisma 7 + adapter-pg sem mensagem de erro

Quando o banco está fora (ou URL é inválida), `$queryRawUnsafe("SELECT 1")` lança `PrismaClientKnownRequestError` com **mensagem vazia**. Impossível debugar pelo log. Solução: bypass do ORM pra health check usando `pg.Pool` direto dentro do `PrismaService.ping()`.

**Ação:** padrão de health check **não passa pelo Prisma**. Adicionar isso ao `docs/architecture.md` ou criar um helper compartilhado `PingService` em `shared/prisma/` que outros módulos usem (não só health).

### 8.3 Conflito de porta com Langfuse

App default subiu na `:3000`, mesma porta do Langfuse em dev local. Resultado: o pulso-js respondia 404 quando a gente tentava pingar `http://localhost:3000/api/public/health`, mascarando o problema real. Trocamos default pra `:8000` (igual o legado Python).

**Ação:** já corrigido em `main.ts`. Quando criar `.env.example`, documentar `PORT=8000` explicitamente.

### 8.4 `DATABASE_URL` com `postgresql+asyncpg://` (dialeto SQLAlchemy)

URL veio do legado Python intacta — o `+asyncpg` é dialeto do SQLAlchemy. O `pg` Node não entende, falha silencioso. Corrigido removendo o `+asyncpg`.

**Ação:** quando criar `.env.example`, documentar formato esperado (`postgresql://...` puro). Quando criar `.env.docker.example`, idem.

### 8.5 `new PrismaClient()` sem opções não funciona em Prisma 7

Prisma 7 exige driver adapter explícito no construtor. O `super()` puro lança erro genérico. Solução: receber `ConfigService` no `PrismaService`, construir `PrismaPg` adapter, passar pro `super({ adapter })`.

**Ação:** documentar no `docs/architecture.md` na seção sobre Prisma — toda subclasse de `PrismaClient` precisa receber `ConfigService` pra construir adapter.

### 8.6 `useValue` órfão em `TestingModule` quando módulo depende de `@Global`

`Test.createTestingModule({ imports: [HealthModule] })` quebrou porque `PrismaService` e `ILangfuseClient` vivem em modules `@Global` (não importados pelo `HealthModule`). Solução: declarar `controllers` + `providers` direto no test module, sem importar `HealthModule`.

**Ação:** padrão pra teste e2e de módulo que depende de `@Global` — **não importar o feature module; recriar os providers direto.** Vale a pena adicionar esse padrão como exemplo em `docs/conventions.md` ou em um novo `docs/testing.md`.

### 8.7 `modules/<feature>/domain/` precisou de `value-objects/`

A regra atual do `docs/architecture.md` diz que `modules/<feature>/domain/` só tem `services/`. Mas o `health` precisou de `HealthCheckResult` (VO específico do módulo, não compartilhado). Quebrei a regra pragmaticamente.

**Ação:** atualizar `docs/architecture.md` e `pulso-js/docs/architecture.md` — `modules/<feature>/domain/` pode ter `services/` **e** `value-objects/` (e `errors/`) quando o conceito for **estritamente local** ao feature. Se vira reutilizável, sobe pra `shared/domain/`.

---

### Lacunas do harness identificadas

- **`docs/architecture.md`** precisa ganhar uma seção sobre **padrão de health check via `pg.Pool` direto**, não Prisma.
- **`docs/architecture.md`** precisa permitir `value-objects/` e `errors/` em `modules/<feature>/domain/`.
- **`docs/conventions.md`** (ou novo `docs/testing.md`) deve documentar o padrão de teste e2e com fakes pra módulo que depende de `@Global`.
- **`.env.example`** ainda não existe — quando criar, documentar `PORT`, `DATABASE_URL` (formato puro), `LANGFUSE_BASE_URL`.

### Que não doeu (positivo)

- **Sensors funcionaram desde o primeiro arquivo.** ESLint + boundaries pegou erros de import antes da gente ver. TypeScript estrito pegou tudo de tipo. Vitest passou 12/12.
- **Pre-commit hook bloqueou commit sujo no teste 2.** Sensor de qualidade no nível do desenvolvedor funciona.
- **Architecture.md como referência** — sempre que tinha dúvida ("onde mora isso?"), o cheat-sheet do agente respondeu sem ambiguidade.
- **Module-template estruturou o trabalho.** Forçou pensar contrato + delta + critérios de aceite antes de qualquer linha de código.