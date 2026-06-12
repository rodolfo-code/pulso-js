# Tech Debt — Fase 5 (slos)

Pontos identificados durante a auto-review em 2026-06-13. **Todos herdados do legado Python** — não são bugs novos da migração, mas decisões de design questionáveis que valem revisão futura.

Status: aceitos pra fechar a fase, marcados como dívida.

---

## 1. `threshold` e `measuredValue` como `number` (perda potencial de precisão)

**Onde:**
- VO [`slo-definition.vo.ts`](../../src/shared/domain/value-objects/slo-definition.vo.ts) — `threshold: number`
- VO [`slo-evaluation.vo.ts`](../../src/shared/domain/value-objects/slo-evaluation.vo.ts) — `measuredValue: number | null`
- Mappers [`slo-definition.mapper.ts`](../../src/shared/repositories/mappers/slo-definition.mapper.ts) e [`slo-evaluation.mapper.ts`](../../src/shared/repositories/mappers/slo-evaluation.mapper.ts) — `Number(row.threshold)` / `Number(row.measuredValue)`

**O que acontece:** Schema Prisma usa `Decimal(20, 6)` (precisão preservada no Postgres), mas as entidades em memória usam `number` (float64 JS).

**Impacto:**
- Para valores até ~9 quadrilhões com 6 casas decimais, JS aguenta sem perda perceptível
- Comparações exatas de SLO (ex: `threshold = 0.000001`) podem dar resultados inconsistentes em casos extremos (`0.1 + 0.2 !== 0.3` em float)
- Para métricas típicas (error_rate ∈ [0,1], latency em ms, % de availability), 6 casas é mais que suficiente

**Origem:** Python usa `Decimal` (precisão arbitrária). JS não tem tipo nativo.

**Compartilha causa com:** Tech debt #3 da Fase 4 (`totalCostUsd`).

### Sugestões de melhoria (avaliadas)

**Opção A — `decimal.js` (precisão arbitrária)**
- Lib: `decimal.js` (~36KB minified)
- Substitui `number` por `Decimal` nas VOs monetárias e de threshold
- **Prós:** equivalência total com `Decimal` Python; sem perda em billing/SLO crítico
- **Contras:** lib em runtime; serialização JSON precisa de `.toString()` em todos os pontos; aritmética via métodos (`a.plus(b)` em vez de `a + b`); curva de aprendizado leve

**Opção B — Strings no contrato HTTP, `number` internamente**
- DTOs aceitam/retornam `threshold` e `measuredValue` como string (`"0.05"`)
- Conversão pra `number` só onde houve aritmética
- **Prós:** menor dependência; preserva precisão pelo menos em transit
- **Contras:** clientes precisam fazer parse; ainda perde precisão em operações

**Opção C — Inteiro em micro-unidades** (ex: `microThreshold` em ppb)
- `0.05` vira `50_000_000` (ppb)
- Inteiro nativo, sem perda
- **Prós:** matemática rápida e exata
- **Contras:** display precisa de divisão; complicado pra métricas com unidades diferentes

**Opção D — Aceitar imprecisão (status atual)**
- **Prós:** zero código
- **Contras:** descobre problemas tarde, em valor extremo

**Recomendação:** **A** quando billing real ou SLO de altíssima precisão entrar em jogo. Pra MVP atual com SLOs típicos (error_rate até 4 casas, latência em ms), **D** é suficiente. Documentar bem pra revisão na primeira métrica que exigir precisão alta.

---

## 2. `Math.round` em JS difere de `round` em Python

**Onde:** [`evaluate-slo.use-case.ts`](../../src/modules/slos/application/use-cases/evaluate-slo.use-case.ts) — função `round(value, decimals)` usada no `_evaluateCbMetric`

**O que acontece:**
- Python: `round(0.5)` = `0` (banker's rounding / round-half-to-even)
- JS `Math.round(0.5)` = `1` (round-half-away-from-zero)

**Impacto:** Diferença em **casos de borda exatos** (ex: 0.00005 → 0.0000 em Python, 0.0001 em JS). Para CB metrics com 4 casas (`cb_open_duration_minutes`, `cb_availability_pct`), valores reais raramente caem exatamente no meio. Difícil de causar comportamento divergente em produção, mas existe.

**Como abordar:**
- Se for crítico (regulação, contrato): implementar banker's rounding explícito:
  ```typescript
  function bankerRound(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    const x = value * factor;
    const r = Math.round(x);
    // Round-half-to-even
    if (Math.abs(x - Math.trunc(x) - 0.5) < Number.EPSILON) {
      return (Math.trunc(x) % 2 === 0 ? Math.trunc(x) : r) / factor;
    }
    return r / factor;
  }
  ```
- Caso contrário: aceitar e documentar no contrato (este arquivo)

**Recomendação:** Aceitar. Diferença teórica em sistemas reais.

---

## 3. `getTraces()` busca tudo da janela e filtra in-memory por slug

**Onde:** [`evaluate-slo.use-case.ts`](../../src/modules/slos/application/use-cases/evaluate-slo.use-case.ts) — `traces = allTraces.filter((t) => extractHierarchy(t).agent === agentSlug)`

**O que acontece:** Igual à dívida #2 da Fase 4 (intelligence). Mesmo problema, mesmo escopo de fix.

**Recomendação:** Resolver junto com a dívida #2 da Fase 4 (usar snapshots periódicos). O `EvaluateSLO` já tenta snapshot primeiro — então quando o scheduler popular snapshots regularmente, esse caminho fica raramente exercitado.

---

## 4. Snapshot pode estar stale (fora da janela do SLO)

**Onde:** [`evaluate-slo.use-case.ts`](../../src/modules/slos/application/use-cases/evaluate-slo.use-case.ts) — `snapshot = await snapshotRepo.getLatestSnapshot(slo.agentId)`

**O que acontece:** O `getLatestSnapshot` retorna o snapshot mais recente do agente, **sem filtrar por janela**. Se um agente tem snapshot de 3 dias atrás e o SLO tem `windowHours: 1`, o use case usa o snapshot velho — avaliação fica baseada em dados fora da janela.

**Impacto:**
- SLO pode passar como `ok` quando deveria ser `breach` (ou vice-versa)
- Quanto mais raro o snapshot, maior o risco
- Pulso-js v1 não tem scheduler de snapshot → o problema é teórico hoje (sem snapshots, cai no Langfuse)

**Como abordar:**
1. Adicionar parâmetro `since: Date` em `getLatestSnapshot(agentId, since?)`
2. No use case, calcular `since = now - windowHours` e passar
3. Se snapshot é mais velho que `since`, cair no caminho do Langfuse

**Origem:** Bug do legado, espelhado.

**Recomendação:** Resolver quando o scheduler de snapshot for implementado (junto com Fase 4 #1 e #2). Sem scheduler, snapshots não são gravados, então o caminho está protegido por falsa segurança.

---

## 5. `extractHierarchy` alocado N vezes no filter

**Onde:** [`evaluate-slo.use-case.ts`](../../src/modules/slos/application/use-cases/evaluate-slo.use-case.ts) — mesma situação da Fase 4 #4

**Recomendação:** Mesma da Fase 4 — provavelmente desaparece quando #3 acima for resolvida (filtro pré-feito via tags ou snapshot).

---

## 6. `extractMetric` retorna `null` silencioso para métrica desconhecida

**Onde:** [`slo-evaluator.service.ts`](../../src/shared/domain/services/slo-evaluator.service.ts) — `extractMetric()` retorna `null` no `default` do switch

**O que acontece:** Se o `slo.metric` for uma string fora dos 7 conhecidos (ex: typo: `"erorr_rate"`), `extractMetric` retorna `null` → use case persiste `insufficient_data`. **Sem erro, sem alerta.** O criador do SLO acha que está sendo avaliado mas nunca é.

**Impacto:**
- Configuração silenciosamente errada nunca é detectada
- Falha de visibilidade — sem audit log, sem warning

**Origem:** Bug explícito do legado — marcado como TECH DEBT (v2.0) no próprio código Python: *"replace the str-keyed dict with a typed KPI DTO in C1 so metric names are validated at the type level rather than returning None silently"*.

**Como abordar:**
- **Opção A:** Validar `metric` na criação do SLO (whitelist no `CreateSLOBody`):
  ```typescript
  @IsIn([
    "error_rate", "avg_latency_ms", "p95_latency_ms",
    "total_requests", "error_count", "total_cost_usd", "total_tokens",
    // CB metrics: aceitar prefix conhecido (regex)
  ])
  ```
- **Opção B:** Lançar `DomainValidationError` no `EvaluateSLO` quando métrica desconhecida, persistir como `breach` com mensagem específica, ou logar warning explícito

**Recomendação:** **A** — fechar a porta no DTO. Sem custo, alto valor.

---

## Como atacar (ordem sugerida)

Combinando com tech debt da Fase 4:

1. **Resolver #4 (snapshot stale) junto com Fase 4 #1 + #5** (scheduler + endpoint de histórico) — uma sub-fase só. SLO consome snapshot fresco.
2. **#6 (validação de métrica no DTO)** — ~30min, fix isolado de alto valor
3. **#1 (decimal.js)** quando billing/SLO de alta precisão entrar em jogo
4. **#3** (filtro nativo) e **#5** (alocação) caem de carona quando snapshot vira fonte primária
5. **#2 (banker's rounding)** — aceitar a menos que surja requisito específico
