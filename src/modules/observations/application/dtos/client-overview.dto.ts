export interface ClientOverviewAgentDto {
  readonly slug: string;
  readonly name: string;
  readonly status: string;
  readonly version: string;
}

export interface ClientOverviewDto {
  userId: string;
  tenantId: string;
  system: string;
  agent: ClientOverviewAgentDto | null;
  traceCount: number;
  traceIds: (string | null)[];
}