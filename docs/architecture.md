# Arquitetura — `pulso-js`

> Guide canônico do desenho do sistema. Deve ser carregado antes de qualquer geração ou modificação de código no projeto. Documento curto por princípio: o que está aqui é invariante; o que muda por módulo ou pela travessia da migração vive em outros documentos.
>
> Regras invioláveis (do tipo "nunca faça X") vivem em `../GOLDEN_RULES.md`. Este documento descreve a **forma** da arquitetura.

---

## Padrões combinados

A arquitetura combina três padrões. Cada um cobre uma dimensão distinta; juntos formam o sistema.

| Padrão                   | Contribuição                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| **Clean Architecture**   | Hierarquia de camadas + Regra de Dependência (única regra)            |
| **Domain-Driven Design** | Vocabulário de modelagem: entity, VO, domain service, bounded context |
| **Modular Monolith**     | Um processo, N bounded contexts isolados                              |

---

## Layout de pastas

```
pulso-js/
├── prisma/                # schema + migrations
├── src/
│   ├── main.ts            # bootstrap NestJS
│   ├── app.module.ts      # raiz — só compõe módulos
│   ├── shared/            # código consumido por várias features
│   └── modules/<feature>/ # feature (bounded context)
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── presentation/
└── test/                  # espelha src/
```

**Duas pastas dentro de `src/`**: `shared/` e `modules/`. Nada mais. O detalhamento de cada `shared/<algo>/` e cada `modules/<feature>/` está em `../../ARQUITETURA.md`.

---

## A Regra de Dependência

Princípio único, inegociável: **camadas externas conhecem as internas; camadas internas nunca conhecem as externas.**

| Camada                 | Pasta                               | Pode importar de                                  |
| ---------------------- | ----------------------------------- | ------------------------------------------------- |
| Domínio (mais interno) | `domain/`                           | apenas `domain/` (do próprio módulo ou de shared) |
| Aplicação              | `application/`                      | `domain/`                                         |
| Interface Adapters     | `infrastructure/` e `presentation/` | `application/`, `domain/`                         |
| Frameworks & Drivers   | NestJS, Prisma, axios (libs)        | —                                                 |

Consequências diretas:

- `domain/` **nunca** importa `@nestjs/*`, `@prisma/client`, `axios`, `class-validator`, ou qualquer biblioteca de framework.
- `application/` também **nunca** importa essas libs.
- Apenas `infrastructure/` e `presentation/` podem usar decorators NestJS e libs de I/O.
- Um teste unitário de use case ou de domain service **não precisa** de NestJS, Postgres ou rede.

---

## Camadas de borda: `infrastructure/` e `presentation/`

A camada de Interface Adapters da Clean Architecture se divide em duas pastas irmãs por direção de fluxo:

| Pasta             | Direção                   | Tipos de código                                      |
| ----------------- | ------------------------- | ---------------------------------------------------- |
| `presentation/`   | Mundo externo → aplicação | Controllers HTTP, DTOs, filtros, interceptors        |
| `infrastructure/` | Aplicação → mundo externo | Repositórios Prisma, clientes HTTP externos, mappers |

São **pastas-irmãs no mesmo nível**, não uma dentro da outra: direções opostas, responsabilidades inversas. Nenhuma das duas conhece a outra — ambas chegam até a `application/`.

---

## Interfaces como `abstract class`

Use cases recebem **apenas o contrato (abstract class)** via DI — nada de tokens auxiliares, nada de `@Inject`.

```ts
// modules/agents/domain/interfaces/agent-repo.interface.ts
export abstract class IAgentRepo {
  abstract getAgentBySlug(slug: string): Promise<Agent | null>;
  abstract updateAgent(agent: Agent): Promise<Agent>;
}

// modules/agents/application/use-cases/register-agent.use-case.ts
@Injectable()
export class RegisterAgentUseCase {
  constructor(private readonly repo: IAgentRepo) {}
}

// modules/agents/agents.module.ts
providers: [{ provide: IAgentRepo, useClass: AgentRepository }];
```

**Por que `abstract class` em vez de `interface` TS pura?** Interfaces TypeScript não existem em runtime — sem identificador real, NestJS DI não consegue resolver. Já uma `abstract class` compila para uma classe JS real e serve duas funções com uma identidade só: tipo na compilação, token de injeção em runtime. Sem `Symbol`, sem arquivo `.token.ts`, sem `@Inject`.

---

## Vocabulário DDD dentro de `domain/`

| Conceito                  | Pasta                   | O que é                                             |
| ------------------------- | ----------------------- | --------------------------------------------------- |
| **Entity**                | `domain/entities/`      | Identidade que persiste no tempo (id imutável)      |
| **Value Object**          | `domain/value-objects/` | Imutável, igualdade por valor                       |
| **Domain Service**        | `domain/services/`      | Operação pura que não pertence a uma entity         |
| **Interface (Repo/Gate)** | `domain/interfaces/`    | Contrato para acesso externo, definido pelo domínio |
| **Domain Error**          | `domain/errors/`        | Exceção semântica do negócio                        |

**Bounded Context**: cada `modules/<feature>/` é um bounded context — fronteira onde vocabulário e modelos são consistentes. O que se chama `Agent` em `modules/agents/` é uma entidade com slug, version e heartbeat; se houvesse `Agent` em outro módulo, poderia significar outra coisa sem conflito.

---

## Modular Monolith

Um único processo Node.js, internamente dividido em módulos de bounded context com fronteiras rígidas:

- Cada feature module tem sua versão completa de `domain/` + `application/` + `infrastructure/` + `presentation/`.
- Módulos comunicam **apenas via abstract classes exportadas** nos `*.module.ts`. Nunca importando arquivos internos uns dos outros.
- Import **horizontal** (`modules/A → modules/B`) é permitido quando B exporta uma interface que A precisa, mas deve ser raro. Se aparece com frequência, o item provavelmente devia estar em `shared/`.
- Import **vertical** (`modules/<x> → shared/*`) é sempre permitido.

---

## Validação e erro

- **Entrada HTTP** é validada em `presentation/dto/*.dto.ts` com `class-validator`. O `ValidationPipe` global é registrado em `shared/config/config.module.ts`.
- **Erro de negócio** é `DomainError` (e subclasses) em `shared/domain/errors/`. Pode ser lançado em qualquer lugar de `domain/` ou `application/`.
- `shared/http/filters/domain-exception.filter.ts` converte `DomainError → HTTP status`. Use case **nunca** conhece status code.

---

## Anti-patterns proibidos

Qualquer código que se encaixe em alguma linha abaixo está **errado por design** e deve ser recusado/refatorado:

| Anti-pattern                                                                                                                              | Razão                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Use case ou domain importando `@prisma/client`, `axios`, `@nestjs/common` (exceto `@Injectable` em use case), `class-validator`           | Acopla lógica de negócio a tecnologia; quebra a Regra de Dependência |
| Controller chamando repositório diretamente (sem passar pelo use case)                                                                    | Lógica de negócio vaza para `presentation/`; impossível reusar       |
| Entity ou VO com decorators ORM (`@Entity`, `@Column`, `@PrimaryColumn`)                                                                  | Entity vira registro de banco; o domínio passa a depender do schema  |
| `presentation/` importando `infrastructure/` ou vice-versa                                                                                | As duas pastas não se conhecem — ambas chegam pela `application/`    |
| Compartilhar Prisma model entre módulos                                                                                                   | Módulos acoplam acidentalmente através do schema                     |
| Propriedades mutáveis públicas em VOs (deveriam ser `readonly`)                                                                           | Encapsulamento perdido; estado pode ser corrompido em qualquer lugar |
| Anemic domain (entities/VOs só com getters/setters; toda lógica em "services")                                                            | Defeito do DDD; concentra regra no procedural, esvazia o modelo      |
| Import horizontal frequente entre `modules/*`                                                                                             | Sinal de que falta uma abstração em `shared/`                        |
| Repositório retornando Prisma model em vez de entidade de domínio                                                                         | Vaza tipo da infra para application/presentation                     |
| Use case lançando `HttpException` ou usando status code HTTP                                                                              | Use case não conhece HTTP; lança `DomainError`, filtro converte      |

---

## Cheat-sheet do agente

Antes de gerar ou revisar código, valide o arquivo contra esta lista:

1. **Em qual camada estou?** `domain/` / `application/` / `infrastructure/` / `presentation/`.
2. **Que imports são permitidos nesta camada?** Consultar a tabela da Regra de Dependência.
3. **Estou criando uma interface nova?** Vai em `domain/interfaces/<x>.interface.ts` como `abstract class` (tipo + token de injeção).
4. **Estou implementando uma interface (repositório, cliente externo)?** Vai em `infrastructure/repositories/` (Prisma) ou `infrastructure/<kind>/` (outros).
5. **Estou criando um controller?** Vai em `presentation/controllers/`, com DTO em `presentation/dto/`.
6. **Estou criando um use case?** Vai em `application/use-cases/`, recebe **apenas interfaces** (abstract classes) via construtor, retorna entidades/VOs do domínio (nunca Prisma models, nunca DTOs).
7. **Preciso de algo de outro módulo?** Importar o `*.module.ts` dele e injetar via abstract class exportada. Nunca acessar arquivos internos.
8. **É lógica de negócio pura?** Vai em `domain/services/` (puro, sem `@Injectable`).
9. **Aplica regra de borda (validar input HTTP, mapear erro para status)?** Vai em `presentation/` (DTO + controller + filter).

---

## Regras estruturais (complemento ao GOLDEN_RULES)

Para as regras invioláveis sobre código (imports, retornos, decorators), ver `../GOLDEN_RULES.md`.

As regras abaixo são sobre **forma da arquitetura** — não sobre código linha-a-linha:

1. **Duas pastas dentro de `src/`**: `shared/` e `modules/`. Nada mais.
2. **`@Global()` é exceção, não regra**: só Config, Prisma, Auth, LangfuseClient, Http. Todo o resto é import explícito.
3. **Sufixos de arquivo obrigatórios**: `.entity.ts`, `.vo.ts`, `.interface.ts`, `.use-case.ts`, `.repository.ts`, `.mapper.ts`, `.controller.ts`, `.dto.ts`, `.module.ts`, `.guard.ts`, `.filter.ts`, `.client.ts`, `.service.ts`.
4. **Repositórios são donos das tabelas**: a tabela X mora no módulo que a possui; outros módulos acessam via interface.