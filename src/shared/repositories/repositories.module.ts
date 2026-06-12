import { Global, Module } from "@nestjs/common";

import { AgentRepository } from "./agent.repository";
import { AuditLogRepository } from "./audit-log.repository";
import { CircuitBreakerRepository } from "./circuit-breaker.repository";
import { IAgentRepo } from "./interfaces/agent-repo.interface";
import { IAuditLogRepo } from "./interfaces/audit-log-repo.interface";
import { ICircuitBreakerRepo } from "./interfaces/circuit-breaker-repo.interface";

@Global()
@Module({
  providers: [
    { provide: IAuditLogRepo, useClass: AuditLogRepository },
    { provide: IAgentRepo, useClass: AgentRepository },
    { provide: ICircuitBreakerRepo, useClass: CircuitBreakerRepository }
  ],
  exports: [IAuditLogRepo, IAgentRepo, ICircuitBreakerRepo]
})
export class RepositoriesModule {}
