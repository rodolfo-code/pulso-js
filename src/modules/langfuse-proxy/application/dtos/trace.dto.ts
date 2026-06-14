import type { ApiTraceWithDetails, ApiTraceWithFullDetails } from "langfuse";

type AnyTraceWithDetails = ApiTraceWithDetails | ApiTraceWithFullDetails;

export class TraceDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly timestamp: Date,
    public readonly environment: string,
    public readonly tags: string[],
    public readonly release: string | null,
    public readonly version: string | null,
    public readonly userId: string | null,
    public readonly sessionId: string | null,
    public readonly isPublic: boolean,
    public readonly input: unknown,
    public readonly output: unknown,
    public readonly metadata: Record<string, unknown>,
    public readonly totalCost: number,
    public readonly latency: number,
    public readonly htmlPath: string,
    public readonly observations: string[],
    public readonly scores: string[]
  ) {}

  static fromLangfuse(d: AnyTraceWithDetails): TraceDto {
    const observations: string[] = Array.isArray(d.observations)
      ? d.observations.map((o) =>
          typeof o === "string" ? o : (o as { id: string }).id
        )
      : [];
    const scores: string[] = Array.isArray(d.scores)
      ? d.scores.map((s) => (typeof s === "string" ? s : (s as { id: string }).id))
      : [];

    return new TraceDto(
      d.id,
      d.name ?? "",
      new Date(d.timestamp),
      d.environment ?? "default",
      d.tags ?? [],
      d.release ?? null,
      d.version ?? null,
      d.userId ?? null,
      d.sessionId ?? null,
      d.public ?? false,
      d.input,
      d.output,
      (d.metadata ?? {}) as Record<string, unknown>,
      d.totalCost,
      d.latency,
      d.htmlPath,
      observations,
      scores
    );
  }
}