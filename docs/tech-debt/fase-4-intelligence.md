# Tech Debt — Fase 4 (intelligence)

Pontos identificados durante a revisão em 2026-06-12. **Todos herdados do legado Python** — não são bugs novos da migração, mas decisões de design questionáveis que valem revisão futura.

Status: aceitos pra fechar a fase, marcados como dívida.

---

## 1. `health_score_history` enche a cada request

**Onde:** [`compute-health-score.use-case.ts`](../../src/modules/intelligence/application/use-cases/compute-health-score.use-case.ts)

**O que acontece:** `GET /intelligence/agents/:slug/health-score` chama `createHealthScore()` em **todo request**. Se o frontend fizer polling de 5s/agente com 10 agentes, são ~17k linhas/dia por instalação.

**Impacto:**
- Tabela cresce indefinidamente
- Maioria das linhas são duplicatas (classification não muda toda hora)
- Custo de storage e índice cresce sem benefício

**Como abordar:**
- **Opção A:** Persistir apenas quando `classification` muda em relação ao último registro
- **Opção B:** Mover persistência pra scheduled job (a cada 5min, calcula e salva 1 linha por agente)
- **Opção C:** Política de retenção (deletar registros > 90 dias via pg_cron)

Recomendação: **B** — desacopla cálculo de cache da gravação histórica.

---

## 2. `getTraces()` busca tudo e filtra em memória

**Onde:** [`compute-health-score.use-case.ts`](../../src/modules/intelligence/application/use-cases/compute-health-score.use-case.ts) (linha do `extractHierarchy`).

**O que acontece:**
```typescript
const allTraces = await this.langfuse.getTraces();
traces = allTraces.filter((t) => extractHierarchy(t).agent === slug);
```

Busca **todos os traces** do Langfuse e filtra in-memory por `metadata.agent`.

**Impacto:**
- Com 100k traces, lê 100k objetos pra usar 50
- Latência do `GET /health-score` cresce linearmente com volume total
- Pressão sobre o Langfuse API

**Origem:** Langfuse v3 não tem filtro nativo por `metadata.agent`. Filtro nativo é por `userId`, `sessionId`, `tags`.

**Como abordar:**
- **Opção A:** Migrar para usar `tags` no trace (`["agent:vendas-bot"]`) e filtrar via `?tags=agent:vendas-bot` na API
- **Opção B:** Persistir snapshot periódico de KPIs (tabela `agent_snapshots` já existe!) e ler dele em vez de chamar Langfuse a cada request
- **Opção C:** Cachear `getTraces()` por N segundos (LRU)

Recomendação: **B** — usar a tabela `agent_snapshots` que já criamos para esse fim. Eliminaria a chamada ao Langfuse no read path.

---

## 3. `totalCostUsd` como `number` em JS (perda potencial de precisão)

**Onde:**
- VO [`agent-snapshot.vo.ts`](../../src/shared/domain/entities/agent-snapshot.entity.ts)
- VO [`kpi-result.vo.ts`](../../src/shared/domain/value-objects/kpi-result.vo.ts)
- Mapper [`agent-snapshot.mapper.ts`](../../src/shared/repositories/mappers/agent-snapshot.mapper.ts) — `Number(row.totalCostUsd)`

**O que acontece:** Schema Prisma usa `Decimal(12, 4)` (precisão arbitrária no Postgres), mas a entidade em memória usa `number` (float64 JS).

**Impacto real:**
- Pra valores < ~9 quadrilhões com 4 casas decimais, JS aguenta sem perda perceptível
- Para casos extremos (cumulativo de muitos meses, conversão de moedas) — pode aparecer ruído na última casa decimal
- Operações aritméticas (somar 0.1 + 0.2 ≠ 0.3) são imprecisas em float

**Origem:** Python usa `Decimal` (precisão arbitrária). JS não tem tipo nativo.

**Como abordar:**
- **Opção A:** Usar `decimal.js` para os campos monetários (`totalCostUsd`, `totalCost`, futuros campos de billing)
- **Opção B:** Manter `number` mas armazenar em centavos × 10000 (int de microcents)
- **Opção C:** Aceitar imprecisão pra MVP, marcar pra revisar quando billing real aparecer

Recomendação: **A** quando billing entrar em jogo (Fase de pulso-auth). Por enquanto C.

---

## 5. Sem endpoint para ler histórico de health scores

**Onde:** [`intelligence.controller.ts`](../../src/modules/intelligence/presentation/controllers/intelligence.controller.ts)

**O que acontece:** Existem 2 endpoints (`GET /intelligence/agents/:slug/health-score` e `GET /intelligence/agents`). Ambos retornam **apenas o cálculo do momento** — nunca exposem a série temporal armazenada em `health_score_history`.

**Impacto:**
- Tabela `health_score_history` enche (ver dívida #1) mas **ninguém lê** o conteúdo
- Frontend não consegue mostrar gráfico de evolução do score
- Cliente não consegue ver "como o agente performou na última semana"
- Impossível investigar regressão ("quando começou a piorar?")

**Origem:** Legado Python também não tem esse endpoint. Provavelmente planejado pra Fase 5 (SLO usa a tabela pra avaliar SLO em janela), mas precisa exposição pra UI/relatório bem antes disso.

**Como abordar:**

Novo endpoint `GET /intelligence/agents/:slug/health-score/history`:
- Query params: `?limit=100` (padrão 100, máximo 1000), `?from=ISO8601`, `?to=ISO8601`
- Retorna lista ordenada por `calculated_at DESC`
- Implementação: novo método `listByAgent(agentId, opts)` em `IHealthScoreRepo`

**Trabalho estimado:** ~30min (1 método repo + 1 endpoint + 1-2 testes e2e)

**Dependência:** **Não atacar isolado** — combinar com a dívida #1 (persistência por scheduler). Sem isso, expor o endpoint de leitura ainda mantém a tabela enchendo a cada chamada de `/health-score`. Atacar em conjunto:

1. Resolver #1 (scheduler persiste a cada N minutos)
2. Modificar `GET /health-score` pra **só ler** (último registro), não recalcular nem gravar
3. Adicionar `GET /health-score/history` pra ler janela
4. Tabela passa a ter cardinalidade controlada **e** conteúdo útil

Estimativa combinada (#1 + #5): 1 sub-fase (~1-2 dias).

---

## 4. `extractHierarchy` alocado N vezes no filter

**Onde:** [`compute-health-score.use-case.ts`](../../src/modules/intelligence/application/use-cases/compute-health-score.use-case.ts)

**O que acontece:**
```typescript
traces = allTraces.filter((t) => extractHierarchy(t).agent === slug);
```

Para cada trace, cria um `HierarchyFields` completo só para ler `.agent`.

**Impacto:** Micro-otimização. Em 10k traces filtrados, são 10k objetos alocados e descartados. Não causa problema funcional.

**Como abordar:**
- **Opção A:** Função auxiliar `extractAgentSlug(trace)` que retorna só a string
- **Opção B:** Se for resolvida a dívida #2 (usar tags ou snapshots), essa some junto

Recomendação: ignorar até resolver #2 — provavelmente desaparece.

---

## Como atacar (ordem sugerida)

Quando começar a Fase de "melhorias de intelligence" ou similar:

1. **#1 + #5 juntos** (scheduler de persistência + endpoint de histórico) — uma sub-fase só, ~1-2 dias. Resolve duas coisas que andam de mão dada: gravar com frequência controlada **e** expor o que foi gravado.
2. **#2 depois** (snapshots periódicos pra eliminar filtro in-memory do Langfuse) — elimina #4 de carona e resolve a parte mais grave de performance
3. **#3** se/quando billing aparecer

Estimativa total: 2-3 sub-fases dedicadas (3-5 dias).
