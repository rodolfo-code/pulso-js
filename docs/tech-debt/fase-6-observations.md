# Tech Debt — Fase 6 (observations)

Pontos identificados durante a auto-review em 2026-06-13. **Todos herdados do legado Python** — não são bugs novos da migração, mas decisões de design questionáveis que valem revisão futura.

Status: aceitos pra fechar a fase, marcados como dívida.

---

## 1. Catch genérico em `getSession` → qualquer erro vira 404 ✅ RESOLVIDO em 2026-06-13

**Onde:** [`get-conversation-detail.use-case.ts`](../../src/modules/observations/application/use-cases/get-conversation-detail.use-case.ts)

```typescript
try {
  session = await this.langfuse.getSession(sessionId);
} catch (error) {
  throw new DomainNotFoundError(`Session not found: ${sessionId}`, {
    cause: error instanceof Error ? error : undefined
  });
}
```

**O que acontece:** Qualquer falha ao buscar session vira **404 "Session not found"** — incluindo:
- Langfuse caído (502 → vira 404 enganoso)
- Timeout (504 → vira 404 enganoso)
- Auth quebrada (401 → vira 404 enganoso)
- Erro de rede (vira 404 enganoso)

**Impacto:** Cliente do endpoint não distingue "session não existe" de "Langfuse está fora do ar". Pode mascarar incidente de infra como problema de dado.

**Origem:** Bug do legado — o próprio código Python marca explicitamente como tech debt no comentário:
> *TECH DEBT (v2.0): captura Exception genérica — refinar para httpx.HTTPStatusError com status 404 para distinguir "não encontrado" de erros de rede (502/504).*

**Como abordar:**
Distinguir os tipos de erro do `LangfuseHttpClient` (que já estão tipados):
```typescript
try {
  session = await this.langfuse.getSession(sessionId);
} catch (error) {
  if (error instanceof LangfuseUpstreamError && error.statusCode === 404) {
    throw new DomainNotFoundError(`Session not found: ${sessionId}`, { cause: error });
  }
  throw error; // 502/504/auth fluem como vieram (filter global mapeia)
}
```

**Recomendação:** Aplicar — ~15 min de trabalho, valor alto (diagnóstico real de incidentes).

**Resolvido em 2026-06-13** — implementado o discriminado por `LangfuseUpstreamError.httpStatus === 404`. Outros erros (`LangfuseUnavailableError`, `LangfuseTimeoutError`, upstream 5xx) propagam como vieram. Coberto por 2 testes unit (404 vira `DomainNotFoundError`, 500/network propagam intactos) + 2 testes e2e (404 → 404, 502 → 502).

---

## 2. `getTraces` sem paginação

**Onde:** ambos os use cases — `GetClientOverview` e `GetConversationDetail`

**O que acontece:** Mesmo problema das Fases 4 #2 e 5 #3 — busca todos os traces da janela e processa in-memory.

**Impacto em escala:**
- 100k traces na janela → ~50MB de JSON na resposta do Langfuse antes do filter
- Memory pressure no Node + I/O significativo
- Latência cresce linearmente com volume

**Recomendação:** Resolver junto com as dívidas paralelas das Fases 4 e 5 — paginação via cursor no `ILangfuseClient`, depois processar em streaming.

---

## 3. `listAgents()` sem paginação ou cache

**Onde:** [`get-client-overview.use-case.ts`](../../src/modules/observations/application/use-cases/get-client-overview.use-case.ts)

```typescript
const agents = await this.agentRepo.listAgents();
const agentMap = new Map(agents.map((a) => [a.slug, a]));
```

**O que acontece:** Cada chamada ao endpoint faz **SELECT \* FROM agents** sem filtro nem cache.

**Impacto:**
- 10k+ agents = SELECT pesado a cada request
- Mapa reconstruído em memória toda vez
- Em SaaS multi-tenant, ainda mais grave: tenant A não deveria sequer ver agents do tenant B (compromete também isolamento de dados)

**Origem:** Espelha legado.

**Como abordar:**
- **Curto prazo:** cache LRU com TTL (60s) — pulso-js tem `@nestjs/cache-manager`
- **Médio prazo:** filtrar por tenant após preparação multi-tenancy (ver `pulso-auth.md`)
- **Longo prazo:** materializar `client_overview` como view ou tabela atualizada por scheduler

**Recomendação:** Cache LRU agora (~20 min de trabalho); refinar quando multi-tenancy entrar.

---

## 4. `extractHierarchy` alocado N vezes no loop

**Onde:** [`get-client-overview.use-case.ts`](../../src/modules/observations/application/use-cases/get-client-overview.use-case.ts) e [`get-conversation-detail.use-case.ts`](../../src/modules/observations/application/use-cases/get-conversation-detail.use-case.ts)

**O que acontece:** Mesma situação das Fases 4 #4 e 5 #5.

**Recomendação:** Igual às fases anteriores — provavelmente desaparece quando snapshots e tags nativas do Langfuse forem usados.

---

## 5. `tenantId` e `system` sobrescritos a cada trace

**Onde:** [`get-client-overview.use-case.ts`](../../src/modules/observations/application/use-cases/get-client-overview.use-case.ts)

```typescript
entry.tenantId = h.tenantId;   // ← sobrescreve a cada trace
entry.system = h.system;
```

**O que acontece:** Se um cliente teve traces de **tenants diferentes** (improvável mas possível em migração ou usuário que muda de organização), **o último tenant da iteração vence**. Pior: se algum trace tem `tenant_id` vazio, sobrescreve um valor bom de iteração anterior.

**Impacto:**
- Dado inconsistente no overview do cliente
- Risco real em migração de tenants ou erros de telemetria

**Origem:** Espelha legado.

**Como abordar:**
- **Opção A:** Setar `tenantId`/`system` apenas na primeira vez que vê o cliente (igual ao `agent`)
- **Opção B:** Verificar consistência e logar warning se variar entre traces
- **Opção C:** Manter sobrescrita mas ignorar vazios:
  ```typescript
  if (h.tenantId) entry.tenantId = h.tenantId;
  if (h.system) entry.system = h.system;
  ```

**Recomendação:** **C** — menor mudança, elimina a regressão "vazio sobrescreve bom". Mas A é mais defensável semanticamente.

---

## 6. `GET /observations/conversations` bypassa o use case ✅ RESOLVIDO em 2026-06-13

**Onde:** [`observations.controller.ts`](../../src/modules/observations/presentation/controllers/observations.controller.ts)

```typescript
@Get("conversations")
listConversations(): Promise<LangfuseList> {
  return this.langfuse.getSessions();  // ← chamada direta, sem use case
}
```

**O que acontece:** Controller chama `ILangfuseClient` diretamente, sem passar por camada de aplicação.

**Impacto:**
- Quebra a separação de camadas adotada no projeto
- Impossível adicionar lógica de domínio depois (ex: filtragem por tenant, agregação) sem refatorar
- Quando entrar multi-tenancy, esse endpoint vira ponto de vazamento — retorna sessions de **todos os tenants**

**Origem:** Espelha legado. O próprio código Python sugere criar `GetConversationList`:
> *TECH DEBT (v2.0): Sugestão 1 — Criar use case GetConversationList em C3 para encapsular essa chamada e manter a separação de camadas.*

**Como abordar:**
Criar `GetConversationListUseCase` em `src/modules/observations/application/use-cases/`:
```typescript
@Injectable()
export class GetConversationListUseCase {
  constructor(@Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient) {}
  execute(): Promise<LangfuseList> {
    // futuramente: filter por tenant, paginação, agregação
    return this.langfuse.getSessions();
  }
}
```

**Recomendação:** Adicionar quando entrar **multi-tenancy** — refatorar agora é overhead sem ganho prático. Mas registrar e tornar parte do escopo multi-tenancy.

**Resolvido em 2026-06-13** — após revisão dos guidelines do projeto ([architecture.md:192](../architecture.md), [GOLDEN_RULES.md:17](../../GOLDEN_RULES.md)) que explicitamente proíbem controller chamar infra direto. Criado `GetConversationListUseCase` (delega pro `ILangfuseClient`), controller agora despacha pra ele. Pronto pra adicionar lógica de negócio (filtro por tenant, paginação, cache, audit) sem mexer no controller. Coberto por 2 testes unit (sucesso e propagação de erro).

---

## 7. `clientId` e `sessionId` como strings livres no path (não-UUID)

**Onde:** [`observations.controller.ts`](../../src/modules/observations/presentation/controllers/observations.controller.ts) — `GET /clients/:clientId` e `GET /conversations/:sessionId`

**O que acontece:** Diferente de `/slos/:id` (UUID validado por `ParseUUIDPipe`), aqui são strings arbitrárias. O Langfuse aceita qualquer string como identificador.

**Impacto:**
- Sem validação na borda, qualquer valor exótico (`null`, `undefined`, caracteres especiais, paths injetados) chega ao Langfuse
- Risco baixo hoje (proxy interno), mas vira vetor de problema se expor publicamente

**Origem:** Característica do Langfuse (não defeito nosso).

**Como abordar:**
- Validação leve de tamanho/charset via DTO:
  ```typescript
  @IsString()
  @Length(1, 256)
  @Matches(/^[a-zA-Z0-9_\-:.]+$/)
  ```
- Aplicar quando o pulso-auth + multi-tenancy entrarem (sanitização de borda fica relevante)

**Recomendação:** Adicionar `@Length(1, 256)` + regex restritivo nos params via `class-validator` (ou pipe customizado) quando preparar pra exposição pública.

---

## Decisão consciente de divergir do legado (não é tech debt)

**Onde:** [`get-conversation-detail.use-case.ts`](../../src/modules/observations/application/use-cases/get-conversation-detail.use-case.ts)

**O que diverge:** O endpoint `GET /observations/conversations/:sessionId` **NÃO espelha o legado**. No legado Python, o response inclui traces em 2 lugares:
- `session.traces[]` (cru, sem `hierarchy`) — incluído pelo próprio `getSession` do Langfuse
- `traces[]` (enriquecido com `hierarchy`) — adicionado pelo use case

No pulso-js, removemos `session.traces` antes de retornar — só `traces` (enriquecido) sobrevive.

**Por que divergimos:**
- Payload original duplicado (cada trace de 3-5KB aparece 2x → response ~2x maior)
- Confusão semântica (qual array é "a verdade"?)
- Trace dentro de `session` perde `hierarchy` — ninguém deveria usar essa versão

**Decisão tomada em 2026-06-13.** Documentada com comentário no use case + 2 testes (unit + e2e) que verificam que `session.traces` está ausente.

**Trade-off:** Quem migrava de legado pra pulso-js e usava `response.session.traces[i].id` precisa trocar pra `response.traces[i].id`. Mudança trivial no frontend; ganho de payload é real.

---

## Como atacar (ordem sugerida)

Combinando com tech debt das Fases 4 e 5:

1. **#1 (404 vs 502/504)** — fix isolado, alto valor, ~15 min
2. **#5 (sobrescrita de tenantId vazio)** — fix isolado, ~10 min, opção C do doc
3. **#3 (cache de `listAgents`)** — ~20 min com cache-manager
4. **#6 + #7 (use case + validação de path params)** — combinar com preparação multi-tenancy (ver `pulso-auth.md`)
5. **#2 + #4** — combinar com paginação do Langfuse (junto com Fase 4 #2 e Fase 5 #3)
