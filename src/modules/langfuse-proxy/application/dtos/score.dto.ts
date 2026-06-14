import type { ApiGetScoresResponseData, ApiScore } from "langfuse";

export class ScoreDto {
  constructor(
    public readonly id: string,
    public readonly traceId: string | null,
    public readonly name: string,
    public readonly value: number | string | null,
    public readonly source: string,
    public readonly dataType: string,
    public readonly comment: string | null,
    public readonly observationId: string | null,
    public readonly configId: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromLangfuse(d: ApiGetScoresResponseData | ApiScore): ScoreDto {
    const value: number | string | null =
      d.dataType === "CATEGORICAL"
        ? (d.stringValue ?? null)
        : typeof d.value === "number"
          ? d.value
          : null;

    return new ScoreDto(
      d.id,
      d.traceId ?? null,
      d.name,
      value,
      d.source,
      d.dataType,
      d.comment ?? null,
      d.observationId ?? null,
      d.configId ?? null,
      new Date(d.createdAt),
      new Date(d.updatedAt)
    );
  }
}