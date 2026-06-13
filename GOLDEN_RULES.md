# GOLDEN_RULES — Regras Invioláveis

> Regras que **nunca** podem ser quebradas neste projeto. Cada uma tem um porquê — leia antes de pedir exceção.
>
> Se uma situação parece exigir quebrar alguma regra, **pare e pergunte**. Não improvise.

---

## Dependência entre camadas

1. **`domain/` só importa `domain/`.**
   Porquê: domínio é o núcleo. Se ele depende de framework ou banco, deixa de ser testável e portável.

2. **`application/` só importa `domain/`.**
   Porquê: use case orquestra regras de negócio; não conhece HTTP, ORM ou rede.

3. **`presentation/` e `infrastructure/` não se importam.**
   Porquê: são pastas-irmãs com direções opostas. Ambas chegam até `application/`. Nenhuma das duas conhece a outra.

4. **`domain/` e `application/` nunca importam `@nestjs/*`, `@prisma/client`, `axios`, `class-validator`.**
   Porquê: acopla regra de negócio a tecnologia. Exceção mínima: `@Injectable()` em use case (necessário pro DI do Nest).

---

## Injeção de dependência

5. **Toda interface de DI é `abstract class`, não `interface` TS.**
   Porquê: `interface` do TS não existe em runtime — sem identificador real, o DI do Nest não resolve. `abstract class` serve simultaneamente como tipo e como token.

6. **Módulo exporta a `abstract class`, nunca a implementação concreta.**
   Porquê: a fronteira do bounded context é a abstração. Quem importa a implementação amarrou-se ao detalhe.

---

## Bounded context (módulos)

7. **Módulos não importam arquivos uns dos outros.**
   Porquê: vocabulário compartilhado (entidades, value objects, repositórios) vive em `shared/`. Se dois módulos precisam do mesmo conceito, esse conceito sobe pra `shared/` — não atravessa por dentro de outro módulo.

8. **Entidades, value objects, errors e repositórios moram em `shared/`.**
   Porquê: modelos e tabelas são patrimônio do projeto, não de um módulo. Cada módulo consome o vocabulário compartilhado; nenhum cria seu próprio `Agent`, `SLO`, `HealthScore` etc. Implementação de repositório é única — não tem cópia por módulo.

---

## Domínio puro

9. **Entity e Value Object não têm decorators de ORM (`@Entity`, `@Column`).**
   Porquê: vira registro de banco. O domínio passa a depender do schema, e a abstração desaba.

10. **Value Object tem propriedades `readonly`.**
    Porquê: VO é definido por valor; se muda no meio da vida, deixa de ser VO.

11. **Use case retorna entidade, VO ou DTO de aplicação — nunca Prisma model nem DTO HTTP.**
    Porquê:
    - Prisma model vazado faz infra escapar pra cima.
    - DTO HTTP vazado (request body / response body de controller) faz application conhecer a borda HTTP.
    - **DTO de aplicação** é categoria distinta: shape de saída próprio do use case, sem dependência de framework HTTP nem de ORM. Usado quando o retorno não é entidade nem VO (sem invariante/comportamento de domínio) — ex.: projeção de leitura, agregação para consumo do controller. Vive em `<modulo>/application/dtos/` com sufixo `.dto.ts`. **NÃO** importa `@nestjs/*`, `class-validator`, nem `@prisma/client`.

12. **Use case lança `DomainError`, nunca `HttpException` ou status HTTP.**
    Porquê: use case não conhece HTTP. O filtro em `presentation/` converte `DomainError` em status.

---

## Auditoria

13. **Toda escrita em audit log é append-only.**
    Porquê: auditoria existe pra ser confiável. Update ou delete num registro de auditoria invalida a prova.

---

## Convenções de nome (sensor mecânico)

14. **`snake_case` é proibido em qualquer identificador TS, inclusive na borda HTTP.**
    Porquê: padrão de JS/TS é `camelCase`. Manter `snake_case` na borda só pra "compatibilidade" cria duas convenções no mesmo arquivo.

15. **Arquivos em `kebab-case` com sufixo categorizador.**
    Porquê: `agent.entity.ts`, `register-agent.use-case.ts`, `agent-repo.interface.ts`. O sufixo diz o que é sem precisar abrir.