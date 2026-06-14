import type { ApiPromptMeta } from "langfuse";

export class PromptMetaDto {
  constructor(
    public readonly name: string,
    public readonly versions: number[],
    public readonly labels: string[],
    public readonly tags: string[],
    public readonly lastUpdatedAt: Date,
    public readonly lastConfig: Record<string, unknown>
  ) {}

  static fromLangfuse(d: ApiPromptMeta): PromptMetaDto {
    return new PromptMetaDto(
      d.name,
      d.versions,
      d.labels,
      d.tags,
      new Date(d.lastUpdatedAt),
      (d.lastConfig ?? {}) as Record<string, unknown>
    );
  }
}