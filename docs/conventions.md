# Convenções — `pulso-js/`

> Convenções de superfície: naming, formato de arquivo, estilo de import e teste. Detalhes "burros" que aparecem 200 vezes por dia.
>
> Decisões maiores (arquitetura, regras de dependência) ficam em `architecture.md`. Regras invioláveis em `../GOLDEN_RULES.md`.

---

## Naming de identificadores

| Tipo                            | Convenção                       | Exemplo                          |
| ------------------------------- | ------------------------------- | -------------------------------- |
| Variável, função, método        | `camelCase`                     | `agentSlug`, `computeHealth()`   |
| Classe, interface (abstract)    | `PascalCase`                    | `Agent`, `IAgentRepo`            |
| Enum e seus membros             | `PascalCase`                    | `AgentStatus.Healthy`            |
| Constante global                | `SCREAMING_SNAKE_CASE`          | `MAX_HEARTBEAT_INTERVAL_MS`      |
| Tipo / type alias               | `PascalCase`                    | `HeartbeatPayload`               |
| Generic                         | `PascalCase`, 1 letra preferido | `T`, `K`, `V`                    |

**Proibido** `snake_case` em qualquer identificador TS — inclusive na borda HTTP (DTOs, query params, headers). Padrão JS/TS é `camelCase`.

---

## Naming de arquivos

`kebab-case` + **sufixo categorizador obrigatório**:

| Sufixo                | O que é                                                |
| --------------------- | ------------------------------------------------------ |
| `.entity.ts`          | Entity de domínio                                      |
| `.vo.ts`              | Value Object                                           |
| `.interface.ts`       | Interface (abstract class) de domínio                  |
| `.use-case.ts`        | Use case da application layer                          |
| `.service.ts`         | Domain service (puro) ou serviço de infra              |
| `.repository.ts`      | Implementação de `IXRepo` em `infrastructure/`         |
| `.mapper.ts`          | Conversor entre Prisma model e entidade/VO de domínio  |
| `.controller.ts`      | Controller HTTP em `presentation/`                     |
| `.dto.ts`             | DTO de entrada ou saída HTTP                           |
| `.module.ts`          | Módulo NestJS                                          |
| `.guard.ts`           | Guard de autenticação/autorização                      |
| `.filter.ts`          | Exception filter                                       |
| `.client.ts`          | Cliente HTTP externo (axios, etc)                      |
| `.error.ts`           | Classe de erro de domínio                              |
| `.spec.ts`            | Teste unitário                                         |
| `.e2e-spec.ts`        | Teste end-to-end                                       |
| `.property.spec.ts`   | Teste property-based (fast-check)                      |

O sufixo diz o que é sem precisar abrir o arquivo. Não use abreviações: `agt.entity.ts` ❌, `agent.entity.ts` ✅.

---

## Layout de testes

- Testes ficam em **`test/`** (irmão de `src/`), **não** ao lado do código.
- A pasta `test/` espelha a estrutura de `src/`: `test/modules/agents/...` corresponde a `src/modules/agents/...`.
- Sufixos definem a categoria (ver tabela acima).
- Property-based tests (fast-check) ficam em `test/<...>/domain/services/*.property.spec.ts` — preferidos para funções puras com invariantes matemáticas.

---

## Estilo de import

**Path alias absoluto `@/` apontando para `src/`**. Dentro de um mesmo módulo (`modules/<x>/`), usar caminho relativo. Cruzando para `shared/` ou para outro módulo, usar `@/`.

```ts
// ✅ dentro do mesmo módulo (relativo)
import { Agent } from "../entities/agent.entity";

// ✅ cruzando para shared/ ou outro módulo
import { PrismaService } from "@/shared/prisma/prisma.service";
import { IAgentRepo } from "@/modules/agents/domain/interfaces/agent-repo.interface";
```

**Ordem de import** (separada por linha em branco):

1. Bibliotecas externas (`@nestjs/*`, `@prisma/client`, etc).
2. Imports `@/` (cross-module ou `shared/`).
3. Imports relativos (`./`, `../`).

Configurar `eslint-plugin-import` para impor a ordem.

---

## Estilo de comentário

Comentário é exceção, não regra.

- **Não comente o quê**: nomes bons já dizem. `// returns the agent` é ruído.
- **Comente o porquê** quando for não-óbvio: uma restrição invisível, um workaround, uma escolha contra-intuitiva. Uma linha basta.
- **Não comente código removido**. Apague — o `git` tem histórico.
- JSDoc apenas em interfaces/abstract classes que outros módulos consomem, e só para descrever contrato externo.

Bom:
```ts
// timingSafeEqual evita ataque de timing comparando byte a byte.
return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
```

Ruim:
```ts
// Compara as duas chaves
return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
```

---

## Testes E2E com providers globais

Quando um módulo depende de providers que vivem em modules `@Global` (`PrismaService`, `ILangfuseClient`, etc.), **não importar o feature module** no `Test.createTestingModule()` — o grafo de DI fica órfão porque os modules globais não são carregados pelo `TestingModule`.

Padrão correto: **recriar `controllers` e `providers` direto no `TestingModule`, com fakes via `useValue`**.

```ts
const moduleRef = await Test.createTestingModule({
  controllers: [HealthController],
  providers: [
    CheckSystemHealthUseCase,
    { provide: PrismaService, useValue: new FakePrismaService() },
    { provide: ILangfuseClient, useValue: new FakeLangfuseClient() }
  ]
}).compile();
```

Fakes vivem em `test/helpers/fake-*.ts`. Cada fake implementa só o método que o teste precisa exercitar (ex.: `FakePrismaService` só tem `ping()` configurável).

---

## Inglês ou português?

- **Código em inglês**: identificadores, comentários inline, JSDoc.
- **Documentação em português**: README, `docs/`, comentários longos explicativos.
- **Mensagens de `DomainError`**: em inglês — facilita debug por logs e ferramentas.
