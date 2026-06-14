import type { ApiMapValue, ApiObservation } from "langfuse";

export class ObservationDto {
  constructor(
    public readonly id: string,
    public readonly traceId: string | null,
    public readonly type: string,
    public readonly name: string | null,
    public readonly startTime: Date,
    public readonly endTime: Date | null,
    public readonly model: string | null,
    public readonly modelParameters: Record<string, ApiMapValue> | null,
    public readonly input: unknown,
    public readonly output: unknown,
    public readonly metadata: Record<string, unknown>,
    public readonly level: string,
    public readonly statusMessage: string | null,
    public readonly parentObservationId: string | null,
    public readonly usageDetails: Record<string, number>,
    public readonly costDetails: Record<string, number>,
    public readonly version: string | null
  ) {}

  static fromLangfuse(d: ApiObservation): ObservationDto {
    return new ObservationDto(
      d.id,
      d.traceId ?? null,
      d.type,
      d.name ?? null,
      new Date(d.startTime),
      d.endTime ? new Date(d.endTime) : null,
      d.model ?? null,
      d.modelParameters ?? null,
      d.input,
      d.output,
      (d.metadata ?? {}) as Record<string, unknown>,
      d.level,
      d.statusMessage ?? null,
      d.parentObservationId ?? null,
      d.usageDetails ?? {},
      d.costDetails ?? {},
      d.version ?? null
    );
  }
}