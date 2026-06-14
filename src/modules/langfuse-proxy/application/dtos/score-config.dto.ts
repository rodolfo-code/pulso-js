import type { ApiConfigCategory, ApiScoreConfig } from "langfuse";

export class ScoreConfigDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dataType: string,
    public readonly isArchived: boolean,
    public readonly minValue: number | null,
    public readonly maxValue: number | null,
    public readonly categories: ApiConfigCategory[] | null,
    public readonly description: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromLangfuse(d: ApiScoreConfig): ScoreConfigDto {
    return new ScoreConfigDto(
      d.id,
      d.name,
      d.dataType,
      d.isArchived,
      d.minValue ?? null,
      d.maxValue ?? null,
      d.categories ?? null,
      d.description ?? null,
      new Date(d.createdAt),
      new Date(d.updatedAt)
    );
  }
}