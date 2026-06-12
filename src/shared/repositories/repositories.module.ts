import { Global, Module } from "@nestjs/common";

import { AgentRepository } from "./agent.repository";
import { AuditLogRepository } from "./audit-log.repository";
import { CircuitBreakerRepository } from "./circuit-breaker.repository";
import { HealthScoreRepository } from "./health-score.repository";
import { IAgentRepo } from "./interfaces/agent-repo.interface";
import { IAuditLogRepo } from "./interfaces/audit-log-repo.interface";
import { ICircuitBreakerRepo } from "./interfaces/circuit-breaker-repo.interface";
import { IHealthScoreRepo } from "./interfaces/health-score-repo.interface";
import { ISLORepo } from "./interfaces/slo-repo.interface";
import { ISnapshotRepo } from "./interfaces/snapshot-repo.interface";
import { SLORepository } from "./slo.repository";
import { SnapshotRepository } from "./snapshot.repository";

@Global()
@Module({
  providers: [
    { provide: IAuditLogRepo, useClass: AuditLogRepository },
    { provide: IAgentRepo, useClass: AgentRepository },
    { provide: ICircuitBreakerRepo, useClass: CircuitBreakerRepository },
    { provide: IHealthScoreRepo, useClass: HealthScoreRepository },
    { provide: ISnapshotRepo, useClass: SnapshotRepository },
    { provide: ISLORepo, useClass: SLORepository }
  ],
  exports: [
    IAuditLogRepo,
    IAgentRepo,
    ICircuitBreakerRepo,
    IHealthScoreRepo,
    ISnapshotRepo,
    ISLORepo
  ]
})
export class RepositoriesModule {}
