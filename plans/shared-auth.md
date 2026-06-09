# Plano — `shared/auth/`

> Cópia adaptada de `docs/module-template.md` (compacta — `shared/` não é módulo feature).
> Mora em `plans/shared-auth.md`.

---

## 1. Origem no legado

- [x] `pulso/src/infrastructure/auth.py` — `verify_api_key` via `APIKeyHeader("X-API-Key")`.
- [x] `pulso/main.py` (linhas 19–26) — `_auth = [Depends(verify_api_key)]` aplicado em **todos** os routers exceto `health`.
- [x] `pulso/src/infrastructure/config.py` — `observatory_api_key` (env `OBSERVATORY_API_KEY`).

---

## 2. Contrato preservado

### Comportamento

- Header esperado: **`X-API-Key`**.
- Comparação contra `OBSERVATORY_API_KEY` do env.
- Se header ausente ou divergente → **401 Unauthorized** com body `{ "detail": "Invalid or missing API key" }`.
- **`GET /health` continua público** — única exceção no projeto inteiro.

### Invariantes

- Comparação **constant-time** (`crypto.timingSafeEqual`) — protege contra timing attacks. *Detalhe novo no TS; o legado FastAPI confia em comparação `==` simples, mas vale endurecer agora.*
- Guard registrado como **`APP_GUARD` global** via `AuthModule` `@Global`. Toda rota nova nasce protegida por default.
- Pra pular o guard, decorator `@Public()` no controller ou no método.

---

## 3. Delta declarado

- **De**: FastAPI `Depends(verify_api_key)` aplicado por router em `main.py`.
  **Para**: NestJS `APP_GUARD` global + `@Public()` decorator pra exceções (inverte o default — agora **tudo protegido por default**, exceção marcada).
- **De**: `APIKeyHeader(name="X-API-Key", auto_error=False)` + checagem manual.
  **Para**: `CanActivate` lendo `request.headers["x-api-key"]` (NestJS lowercase) + `timingSafeEqual`.
- **De**: settings global via `get_settings()`.
  **Para**: `ConfigService<EnvConfig, true>` injetado no construtor do guard.
- **De**: `observatory_api_key: str` no Settings.
  **Para**: `observatoryApiKey: string` em `EnvConfig` (mapeado de `OBSERVATORY_API_KEY`).
- **De**: comparação `==`.
  **Para**: `crypto.timingSafeEqual` (constant-time).

---

## 4. Critérios de aceite

- [ ] **Unit (Guard)**:
  - Sem header → lança `UnauthorizedException` (401).
  - Header com valor errado → lança `UnauthorizedException`.
  - Header com valor correto → retorna `true`.
  - Rota marcada com `@Public()` → retorna `true` independente do header.
- [ ] **E2E**:
  - `GET /health` **sem** header → 200 OK (continua público).
  - `GET /health` **com** header inválido → 200 OK (rota `@Public()` ignora guard).
  - Criar rota dummy de teste (ex.: `GET /test-protected`) → 401 sem header, 200 com header correto.
- [ ] **Validação manual**: depois da migração, `curl http://localhost:8000/health` continua respondendo 200; qualquer outra rota (ex.: futura `/agents`) sem header retorna 401.

---

## 5. Checklist de invariantes (`GOLDEN_RULES.md`)

(Preencher antes de fechar o PR.)

---

## 6. Notas de migração

### Arquivos novos em `shared/`

- `shared/auth/api-key.guard.ts` — implementa `CanActivate`. Recebe `ConfigService<EnvConfig, true>` e `Reflector` via DI. Lê `OBSERVATORY_API_KEY` do env. Lê metadado `isPublic` via Reflector — se presente, pula. Senão, compara header com `timingSafeEqual`.
- `shared/auth/public.decorator.ts` — `SetMetadata("isPublic", true)`. Exporta `Public()`.
- `shared/auth/auth.module.ts` — `@Global`. `providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }]`.

### Mudanças em arquivos existentes

- `shared/config/env.validation.ts` — adicionar campo `observatoryApiKey: string` (mapeado de `OBSERVATORY_API_KEY`).
- `src/app.module.ts` — importar `AuthModule`.
- `src/modules/health/presentation/controllers/health.controller.ts` — anotar `@Public()` na classe.

### Testes novos

- `test/shared/auth/api-key.guard.spec.ts` (unit).
- `test/modules/health/e2e/health.e2e-spec.ts` — atualizar pra confirmar que `@Public()` continua liberando.

### Validação Docker

- `pnpm docker:rebuild`
- `curl http://localhost:8000/health` → 200 (público)
- `curl http://localhost:8000/qualquer-rota-protegida-no-futuro` → 401 sem header
- Hoje, como só temos `/health`, o teste prático é só confirmar que `/health` continua respondendo 200.

### Decisões fixadas

- **`@Public()` na classe** do `HealthController` (não no método) — toda rota do health é pública.
- **`crypto.timingSafeEqual`** — endurecimento vs legado (`==`). Justificado: API key é credencial.
- **`AuthModule` é `@Global`** — guard global, pra toda rota nascer protegida.
- **Header case-insensitive**: NestJS passa headers em lowercase (`x-api-key`). Aceitar maiúsculas/minúsculas implicitamente (Node já faz isso).

---

## 7. Encerramento

1. Atualizar `docs/status.md`:
   - `shared/auth` → `migrado`
   - `shared/config` → ainda `em andamento` (uma env nova: `observatoryApiKey`)
2. Atualizar coluna `Plano` em `docs/status.md` apontando pra este arquivo.
3. **Revisão crítica** — algum guide ambíguo? algum sensor que deixou passar erro?