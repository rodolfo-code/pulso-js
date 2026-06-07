import { Global, Module } from "@nestjs/common";

import { ILangfuseClient } from "./interfaces/langfuse-client.interface";
import { LangfuseHttpClient } from "./langfuse-http.client";

@Global()
@Module({
  providers: [
    { provide: ILangfuseClient, useClass: LangfuseHttpClient }
  ],
  exports: [ILangfuseClient]
})
export class LangfuseClientModule {}