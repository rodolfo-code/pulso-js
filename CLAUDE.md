# Pulso JS — Migração Python → TypeScript

Projeto de destino da migração. Origem Python/FastAPI vive em `../pulso/` (somente leitura, referência canônica).

## Antes de qualquer mudança neste projeto

**Leia obrigatoriamente, na ordem:**

1. [`AGENTS.md`](AGENTS.md) — porta de entrada que aponta o resto
2. [`GOLDEN_RULES.md`](GOLDEN_RULES.md) — regras invioláveis da arquitetura
3. [`docs/architecture.md`](docs/architecture.md) — forma do sistema (Clean Architecture + DDD + Modular Monolith)
4. [`docs/conventions.md`](docs/conventions.md) — naming, imports, testes
5. [`docs/status.md`](docs/status.md) — fase atual + inventário de módulos (estado da migração)
6. [`../ARQUITETURA.md`](../ARQUITETURA.md) — mapeamento Python→TS + decisões fixadas (na pasta-mãe)

Não improvisar. Se algo parece exigir quebrar uma regra do `GOLDEN_RULES.md`, **pare e pergunte**.

## Antes de migrar qualquer módulo

Ler o código Python correspondente em `../pulso/src/` é obrigatório. **Espelhar 1:1** o contrato HTTP, payloads e semântica visível do legado. "Redesenho arquitetural" se aplica somente às camadas internas (modules vs shared, hexagonal, naming), não ao contrato externo.

## Fase atual

Conforme `docs/status.md`. Ler antes de propor próxima fase.
