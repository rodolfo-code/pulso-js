import type { ApiDataset } from "langfuse";

export class DatasetDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly metadata: Record<string, unknown>,
    public readonly projectId: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromLangfuse(d: ApiDataset): DatasetDto {
    return new DatasetDto(
      d.id,
      d.name,
      d.description ?? null,
      (d.metadata ?? {}) as Record<string, unknown>,
      d.projectId,
      new Date(d.createdAt),
      new Date(d.updatedAt)
    );
  }
}