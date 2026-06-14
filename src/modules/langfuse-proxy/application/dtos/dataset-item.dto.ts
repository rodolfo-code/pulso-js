import type { ApiDatasetItem } from "langfuse";

export class DatasetItemDto {
  constructor(
    public readonly id: string,
    public readonly datasetId: string,
    public readonly datasetName: string,
    public readonly input: unknown,
    public readonly expectedOutput: unknown,
    public readonly metadata: Record<string, unknown>,
    public readonly sourceTraceId: string | null,
    public readonly sourceObservationId: string | null,
    public readonly status: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromLangfuse(d: ApiDatasetItem): DatasetItemDto {
    return new DatasetItemDto(
      d.id,
      d.datasetId,
      d.datasetName,
      d.input,
      d.expectedOutput,
      (d.metadata ?? {}) as Record<string, unknown>,
      d.sourceTraceId ?? null,
      d.sourceObservationId ?? null,
      d.status,
      new Date(d.createdAt),
      new Date(d.updatedAt)
    );
  }
}