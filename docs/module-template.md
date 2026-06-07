# Plano — `<NOME_DO_MÓDULO>`

> Cópia preenchida deste template. Existe **um por módulo**. Mora em `plans/<feature>.md`.
>
> Preencher **antes** de escrever código. Atualizar ao longo da migração. Manter consistente com o estado real até o módulo ser marcado `migrado` em `docs/status.md`.

---

## 1. Origem no legado

Arquivos do `../pulso/` que são referência canônica deste módulo:

- [ ] `pulso/src/...`
- [ ] `pulso/src/...`

(listar todos os `.py` que cobrem domínio, application, repositórios, rotas, schemas e testes do módulo)

---

## 2. Contrato preservado

O que **continua igual** entre Python e TS:

- **Assinaturas externas (HTTP)**:
  - `GET /...` — parâmetros, retorno, status codes.
  - `POST /...` — body, retorno, status codes.
- **Invariantes de domínio**:
  - Idempotência de operação X.
  - Restrição matemática Y (ex.: health score ∈ [0, 1]).
  - Ordem de side effects Z.
- **Erros semânticos**:
  - `XNotFoundError` → 404.
  - `XValidationError` → 400.
  - `XConflictError` → 409.

---

## 3. Delta declarado

O que **muda intencionalmente**:

- **De**: `snake_case` no body HTTP.
  **Para**: `camelCase` na borda (`GOLDEN_RULES.md` regra 14).
- **De**: SQLAlchemy + Pydantic.
  **Para**: Prisma + class-validator.
- **De**: `Depends()` do FastAPI.
  **Para**: DI nativo do NestJS via `abstract class`.
- **De**: lógica concentrada em `service.py`.
  **Para**: separação em `domain/services/` (puro) + `application/use-cases/` (orquestração).

---

## 4. Critérios de aceite

- [ ] **Unit**: todos os domain services (puro) com testes de invariante (property-based onde fizer sentido — `fast-check`).
- [ ] **Unit**: todos os use cases com fakes dos repositórios.
- [ ] **E2E**: cada rota HTTP do controller com cenário feliz + cenário de erro.
- [ ] **Paridade**: outputs determinísticos comparados com fixture gerado pelo Python (`test/fixtures/parity/<feature>/`).

---

## 5. Checklist de invariantes (`GOLDEN_RULES.md`)

Marcar **antes** de abrir PR.

### Dependência entre camadas
- [ ] `domain/` só importa de `domain/` (regra 1).
- [ ] `application/` só importa de `domain/` (regra 2).
- [ ] `presentation/` não importa de infraestrutura interna ao módulo (regra 3 — já não existe `infrastructure/` em módulos).
- [ ] `domain/` e `application/` não importam framework/libs — exceto `@Injectable()` em use case (regra 4).

### DI
- [ ] Interfaces são `abstract class` (regra 5).
- [ ] `shared/repositories/repositories.module.ts` (`@Global`) exporta a `abstract class`; nenhuma implementação é exportada (regra 6).

### Bounded context
- [ ] Sem importar arquivos de outro módulo (regra 7). Conceitos cruzados vivem em `shared/`.
- [ ] Entidades, VOs, errors e repositórios consumidos vêm de `shared/`; não criados dentro do módulo (regra 8).

### Domínio puro
- [ ] Entity/VO sem decorators de ORM (regra 9).
- [ ] VO `readonly` (regra 10).
- [ ] Use case retorna entidade/VO de `shared/domain/`, nunca Prisma model nem DTO (regra 11).
- [ ] Use case lança `DomainError` de `shared/domain/errors/`, nunca status HTTP (regra 12).

### Auditoria (se aplicável)
- [ ] Audit log append-only (regra 13).

### Convenções
- [ ] Zero `snake_case` em TS (regra 14).
- [ ] Arquivos em `kebab-case` + sufixo (regra 15).

---

## 6. Notas de migração

(Decisões, armadilhas encontradas. Vira insumo pro próximo módulo e pra revisar o harness.)

---

## 7. Encerramento

1. Atualizar `docs/status.md` → mudar `Status` do módulo pra `migrado`.
2. Atualizar coluna `Plano` em `docs/status.md` apontando pra este arquivo.
3. Se foi o spike, revisar criticamente o harness: guide ambíguo? sensor que deixou passar?