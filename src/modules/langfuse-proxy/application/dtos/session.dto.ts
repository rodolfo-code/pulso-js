import type { ApiSession, ApiSessionWithTraces, ApiTrace } from "langfuse";

export class SessionDto {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly createdAt: Date,
    public readonly environment: string,
    public readonly traces: ApiTrace[]
  ) {}

  static fromLangfuse(d: ApiSession | ApiSessionWithTraces): SessionDto {
    const traces = "traces" in d && Array.isArray(d.traces) ? d.traces : [];
    return new SessionDto(
      d.id,
      d.projectId,
      new Date(d.createdAt),
      d.environment ?? "default",
      traces
    );
  }
}