# AGENTS.md — Pulso JS

> Porta de entrada para qualquer agente (humano ou IA) que vai trabalhar neste repositório. **Comece por aqui.**

## O que é este projeto

**Pulso JS** é o motor do produto SaaS Pulso (mercado LATAM) — sistema de observabilidade que registra agentes, calcula health score, avalia SLOs e proxia o Langfuse.

## Arquitetura

**Clean Architecture + DDD + Modular Monolith.** Detalhes em [docs/architecture.md](docs/architecture.md).

Resumo em uma frase: `src/` tem só duas pastas — `shared/` (código consumido por várias features) e `modules/<feature>/` (cada feature com `domain/`, `application/`, `infrastructure/`, `presentation/`).

## Ordem de leitura (antes de mexer em código)

1. [GOLDEN_RULES.md](GOLDEN_RULES.md) — regras invioláveis.
2. [docs/architecture.md](docs/architecture.md) — forma do sistema.
3. [docs/conventions.md](docs/conventions.md) — naming, imports, testes.
4. [docs/status.md](docs/status.md) — **fase atual** do projeto + inventário de módulos.
5. [docs/module-template.md](docs/module-template.md) — template de plano (usar conforme a fase).

Detalhamento extra: `../ARQUITETURA.md` (na raiz da pasta-mãe) — layout completo de módulos, mapeamento Python→TS, decisões fixadas.

## Stack

- Node 20+
- NestJS 10+
- Prisma
- pnpm (package manager — **não** usar `npm` ou `yarn`)
- Vitest (testes)
- ESLint + `eslint-plugin-boundaries` (sensor de camada)

## Como rodar

> Comandos disponíveis após o setup do projeto NestJS estar concluído.

```bash
pnpm install
pnpm dev          # nest start --watch
pnpm test         # vitest run
pnpm test:e2e     # vitest run --config vitest.e2e.config.ts
pnpm lint         # eslint
pnpm typecheck    # tsc --noEmit
```

## Testar a API

A coleção do Postman com **todas as rotas e dados fictícios** está versionada em [`postman/pulso-js.postman_collection.json`](postman/pulso-js.postman_collection.json). Importar no Postman: **Import → arraste o arquivo**. A coleção já vem com:

- Header `x-api-key` configurado globalmente (lê do env var `apiKey` da coleção)
- Variáveis prontas: `baseUrl`, `apiKey`, `tenantSlug`, `agentSlug`, `traceId`, etc.
- Pastas organizadas por módulo: Health, Agents, Langfuse Proxy
- Bodies de exemplo em todos os POSTs

Atualizar a coleção quando criar uma rota nova é responsabilidade do PR — entra junto com o controller.

## Sensors no CI

Type-check (`tsc --noEmit`) + lint (`eslint`) + testes (`vitest`). Falha em qualquer um bloqueia merge. Detalhes em `.github/workflows/ci.yml`.

## Fluxo de trabalho

**Antes de começar, leia [docs/status.md](docs/status.md) e verifique a `Fase atual`.**

- **Fase `travessia`** → siga "Migrando um módulo do legado".
- **Fase `produção`** → siga "Adicionando uma feature nova".

### Migrando um módulo do legado (fase `travessia`)

A versão Python (origem) vive em `../pulso/` (somente leitura, referência canônica).

1. Ler o módulo original no Python (`../pulso/src/...`).
2. Copiar [docs/module-template.md](docs/module-template.md) para `plans/<feature>.md` e preencher.
3. Implementar respeitando `docs/architecture.md` e `GOLDEN_RULES.md`.
4. Rodar sensors localmente; não commitar com lint vermelho.
5. Atualizar a entrada do módulo em [docs/status.md](docs/status.md).

### Adicionando uma feature nova (fase `produção`)

1. Criar `src/modules/<feature>/` com a estrutura padrão (`domain/`, `application/`, `infrastructure/`, `presentation/`).
2. Escrever testes em `test/modules/<feature>/`.
3. Respeitar `docs/architecture.md` e `GOLDEN_RULES.md`.
4. Rodar sensors localmente.
5. Adicionar a feature em [docs/status.md](docs/status.md) (inventário do sistema).

## Quando em dúvida

Se uma situação parece exigir quebrar uma regra do `GOLDEN_RULES.md`, **pare e pergunte**. Não improvise.