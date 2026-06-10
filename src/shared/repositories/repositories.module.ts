import { Global, Module } from "@nestjs/common";

import { AuditLogRepository } from "./audit-log.repository";
import { IAuditLogRepo } from "./interfaces/audit-log-repo.interface";

@Global()
@Module({
  providers: [
    {
      provide: IAuditLogRepo,
      useClass: AuditLogRepository
    }
  ],
  exports: [IAuditLogRepo]
})
export class RepositoriesModule {}
