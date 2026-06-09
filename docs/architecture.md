# Arquitetura — `pulso-js`

> Guide canônico do desenho do sistema. Deve ser carregado antes de qualquer geração ou modificação de código no projeto. Documento curto por princípio: o que está aqui é invariante; o que muda por módulo ou pela travessia da migração vive em outros documentos.
>
> Regras invioláveis (do tipo "nunca faça X") vivem em `../GOLDEN_RULES.md`. Este documento descreve a **forma** da arquitetura.

---

## Padrões combinados

A arquitetura combina três padrões. Cada um cobre uma dimensão distinta; juntos formam o sistema.

| Padrão                   | Contribuição                                                            |
| ------------------------ | ----------------------------------------------------------------------- |
| **Clean Architecture**   | Hierarquia de camadas + Regra de Dependência (única regra)              |
| **Domain-Driven Design** | Vocabulário de modelagem: entity, VO, domain service, domain error      |
| **Modular Monolith**     | Um processo, N módulos funcionais; vocabulário e dados em `shared/`     |

---

## Layout de pastas

```
pulso-js/
├── prisma/                       # schema + migrations
├── src/
│   ├── main.ts                   # bootstrap NestJS
│   ├── app.module.ts             # raiz — só compõe módulos
│   ├── shared/                   # vocabulário + infraestrutura do projeto
│   │   ├── domain/               # entities + value objects + errors
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   └── errors/
│   │   ├── repositories/         # repos + interfaces + mappers (todos)
│   │   │   ├── interfaces/
│   │   │   ├── mappers/
│   │   │   ├── repositories.module.ts
│   │   │   └── *.repository.ts
│   │   ├── prisma/               # PrismaService
│   │   ├── config/               # @nestjs/config + ValidationPipe
│   │   ├── auth/                 # ApiKeyGuard
│   │   ├── http/                 # filtros, interceptors globais
│   │   └── langfuse-client/      # cliente HTTP Langfuse
│   └── modules/<feature>/        # agrupamento funcional
│       ├── domain/
│       │   ├── services/         # domain services específicos do feature
│       │   ├── value-objects/    # (opcional) VOs estritamente locais ao feature
│       │   └── errors/           # (opcional) errors estritamente locais ao feature
│       ├── application/
│       │   └── use-cases/
│       ├── presentation/         # controllers + DTOs
│       │   ├── controllers/
│       │   └── dto/
│       └── <feature>.module.ts
└── test/                         # espelha src/
```

**Duas pastas dentro de `src/`**: `shared/` e `modules/`. Nada mais. Detalhamento completo (mapeamento Python→TS, decisões fixadas) em `../../ARQUITETURA.md`.

---

## A Regra de Dependência

Princípio único, inegociável: **camadas externas conhecem as internas; camadas internas nunca conhecem as externas.**

| Camada            | Pasta                                                                   | Pode importar de                          |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------------------- |
| Domain            | `shared/domain/` + `modules/*/domain/`                                  | só `domain/` (shared ou próprio módulo)   |
| Application       | `modules/*/application/`                                                | `domain/`                                 |
| Infrastructure    | `shared/repositories/`, `shared/prisma/`, `shared/langfuse-client/`, `shared/auth/`, `shared/http/`, `shared/config/` | `domain/`                                 |
| Presentation      | `modules/*/presentation/`                                               | `application/`, `domain/`, `shared/`      |

Consequências diretas:

- `shared/domain/` e `modules/*/domain/services/` **nunca** importam `@nestjs/*`, `@prisma/client`, `axios`, `class-validator`, ou qualquer biblioteca de framework.
- `application/` também **nunca** importa essas libs — exceto `@Injectable()` em use case.
- Apenas `shared/repositories/`, `shared/prisma/`, `shared/auth/`, `shared/http/`, `shared/langfuse-client/`, `shared/config/` e `modules/*/presentation/` podem usar decorators NestJS e libs de I/O.
- Um teste unitário de use case ou de domain service **não precisa** de NestJS, Postgres ou rede.

---

## Borda de entrada e borda de saída

Duas direções de fluxo, dois lugares distintos:

| Pasta                                  | Direção                                  | Tipos de código                              |
| -------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| `modules/<feature>/presentation/`      | Mundo externo → aplicação                | Controllers HTTP, DTOs                       |
| `shared/repositories/`                 | Aplicação → Postgres                     | Repositórios Prisma + mappers + interfaces   |
| `shared/langfuse-client/`              | Aplicação → API Langfuse                 | Cliente HTTP                                 |
| `shared/http/`                         | Cross-cutting (mundo externo)            | Filtros globais, interceptors                |

A borda de entrada (presentation) mora em cada `modules/<feature>/` porque é específica da funcionalidade. As bordas de saída moram em `shared/` porque o vocabulário (Agent, SLO, etc.) é patrimônio do projeto.

---

## Interfaces como `abstract class`

Use cases recebem **apenas o contrato (abstract class)** via DI — nada de tokens auxiliares, nada de `@Inject`.

```ts
// shared/repositories/interfaces/agent-repo.interface.ts
import { Agent } from "@/shared/domain/entities/agent.entity";

export abstract class IAgentRepo {
  abstract getAgentBySlug(slug: string): Promise<Agent | null>;
  abstract updateAgent(agent: Agent): Promise<Agent>;
}

// shared/repositories/agent.repository.ts
@Injectable()
export class AgentRepository extends IAgentRepo {
  constructor(private prisma: PrismaService) { super(); }
  // ...
}

// shared/repositories/repositories.module.ts
@Global()
@Module({
  providers: [
    { provide: IAgentRepo, useClass: AgentRepository },
    // outros repos
  ],
  exports: [IAgentRepo /* , ... */]
})
export class RepositoriesModule {}

// modules/agents/application/use-cases/register-agent.use-case.ts
@Injectable()
export class RegisterAgentUseCase {
  constructor(private readonly repo: IAgentRepo) {}
}
```

**Por que `abstract class` em vez de `interface` TS pura?** Interfaces TypeScript não existem em runtime — sem identificador real, NestJS DI não consegue resolver. Já uma `abstract class` compila para uma classe JS real e serve duas funções com uma identidade só: tipo na compilação, token de injeção em runtime. Sem `Symbol`, sem arquivo `.token.ts`, sem `@Inject`.

---

## Vocabulário DDD

| Conceito                  | Pasta                                | O que é                                             |
| ------------------------- | ------------------------------------ | --------------------------------------------------- |
| **Entity**                | `shared/domain/entities/`            | Identidade que persiste no tempo (id imutável)      |
| **Value Object**          | `shared/domain/value-objects/`       | Imutável, igualdade por valor                       |
| **Domain Error**          | `shared/domain/errors/`              | Exceção semântica do negócio                        |
| **Interface (Repo/Gate)** | `shared/repositories/interfaces/`    | Contrato para acesso externo                        |
| **Domain Service**        | `modules/<feature>/domain/services/` | Operação pura específica de uma feature             |

> **Conceitos estritamente locais a uma feature** (value objects e errors usados só dentro daquele módulo) podem viver em `modules/<feature>/domain/value-objects/` e `modules/<feature>/domain/errors/`. Quando o conceito virar reutilizável por outro módulo, sobe pra `shared/domain/`. Exemplo: `HealthCheckResult` em `modules/health/domain/value-objects/`.

**Vocabulário compartilhado, não bounded contexts isolados**: o pulso é um produto único. Entidades como `Agent` e `SLO` são patrimônio do projeto inteiro, não de um módulo. Cada `modules/<feature>/` agrupa use cases, controllers e domain services em torno de uma funcionalidade — sem ser dono de nenhum modelo.

---

## Modular Monolith

Um único processo Node.js, organizado em camadas e em agrupamentos funcionais:

- **`shared/`** carrega vocabulário e infraestrutura: entities, value objects, errors, repositórios, Prisma, config, auth, http, cliente Langfuse.
- **`modules/<feature>/`** carrega trabalho funcional: use cases, domain services específicos, controllers, DTOs.
- Módulos importam livremente de `shared/`. **Módulos nunca importam uns dos outros.**
- Se dois módulos precisam do mesmo conceito, esse conceito sobe pra `shared/` — não atravessa por dentro de outro módulo.

---

## Health check de dependências

Health checks **não passam pelo ORM**. Prisma 7 + `@prisma/adapter-pg` tem bug conhecido: `$queryRaw`/`$queryRawUnsafe` falha com `PrismaClientKnownRequestError` de mensagem vazia quando o banco está fora — impossível debugar. Em vez disso:

- **Postgres**: `PrismaService.ping()` usa um `pg.Pool` dedicado (`max: 1`, `idleTimeoutMillis: 1000`) ao lado do `PrismaClient` normal. Falha com erro real (`ECONNREFUSED`, etc).
- **Langfuse** (ou qualquer cliente HTTP externo): usar `fetch` nativo com `AbortController` (timeout 5s). Lançar em falha.

Use case de health captura essas exceções e converte em status (`ok`/`degraded`/`unavailable`). Nunca propaga erro pra fora do bounded context.

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
| Módulo importando qualquer arquivo de outro módulo                                                                                        | Vocabulário compartilhado vive em `shared/`; comunicação cruzada é proibida |
| Módulo criando sua própria entidade/VO/repositório que duplica conceito de `shared/`                                                      | Entidades são patrimônio do projeto; duplicar gera divergência       |
| Propriedades mutáveis públicas em VOs (deveriam ser `readonly`)                                                                           | Encapsulamento perdido; estado pode ser corrompido em qualquer lugar |
| Anemic domain (entities/VOs só com getters/setters; toda lógica em "services")                                                            | Defeito do DDD; concentra regra no procedural, esvazia o modelo      |
| Repositório retornando Prisma model em vez de entidade de domínio                                                                         | Vaza tipo da infra para application/presentation                     |
| Use case lançando `HttpException` ou usando status code HTTP                                                                              | Use case não conhece HTTP; lança `DomainError`, filtro converte      |

---

## Cheat-sheet do agente

Antes de gerar ou revisar código, valide o arquivo contra esta lista:

1. **Em qual camada estou?** `shared/domain/` · `shared/repositories/` · `modules/<feature>/domain/services/` · `modules/<feature>/application/` · `modules/<feature>/presentation/`.
2. **Que imports são permitidos nesta camada?** Consultar a tabela da Regra de Dependência.
3. **Estou criando uma interface nova (repo, cliente externo)?** Vai em `shared/repositories/interfaces/<x>.interface.ts` como `abstract class` (tipo + token de injeção).
4. **Estou implementando uma interface?** Vai em `shared/repositories/` (Prisma) ou em `shared/<kind>/` (outros — `langfuse-client`, etc.).
5. **Estou criando um controller?** Vai em `modules/<feature>/presentation/controllers/`, com DTO em `presentation/dto/`.
6. **Estou criando um use case?** Vai em `modules/<feature>/application/use-cases/`, recebe **apenas interfaces** (abstract classes) via construtor, retorna entidades/VOs do domínio (nunca Prisma models, nunca DTOs).
7. **Preciso de algo de outro módulo?** Você **não importa de outro módulo**. Se o conceito é compartilhado, ele mora em `shared/`. Importe de lá.
8. **É lógica de negócio pura específica de uma feature?** Vai em `modules/<feature>/domain/services/`.
9. **É vocabulário do projeto (entidade, VO, erro)?** Vai em `shared/domain/`.
10. **Aplica regra de borda (validar input HTTP, mapear erro para status)?** DTO + controller em `modules/<feature>/presentation/`; filtro em `shared/http/filters/`.

---

## Regras estruturais (complemento ao GOLDEN_RULES)

Para as regras invioláveis sobre código (imports, retornos, decorators), ver `../GOLDEN_RULES.md`.

As regras abaixo são sobre **forma da arquitetura** — não sobre código linha-a-linha:

1. **Duas pastas dentro de `src/`**: `shared/` e `modules/`. Nada mais.
2. **`@Global()` é exceção, não regra**: só Config, Prisma, Auth, LangfuseClient, Http e Repositories. Todo o resto é import explícito.
3. **Sufixos de arquivo obrigatórios**: `.entity.ts`, `.vo.ts`, `.interface.ts`, `.use-case.ts`, `.repository.ts`, `.mapper.ts`, `.controller.ts`, `.dto.ts`, `.module.ts`, `.guard.ts`, `.filter.ts`, `.client.ts`, `.service.ts`.
4. **Entidades, value objects, errors e repositórios moram em `shared/`**: vocabulário e dados são patrimônio do projeto. Módulos consomem; nenhum cria entidade ou repositório próprio.