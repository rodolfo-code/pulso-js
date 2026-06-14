import type { ApiPrompt } from "langfuse";

export class PromptDto {
  constructor(
    public readonly name: string,
    public readonly version: number,
    public readonly type: "text" | "chat",
    public readonly prompt: unknown,
    public readonly config: Record<string, unknown>,
    public readonly tags: string[],
    public readonly labels: string[],
    public readonly commitMessage: string | null
  ) {}

  static fromLangfuse(d: ApiPrompt): PromptDto {
    return new PromptDto(
      d.name,
      d.version,
      d.type,
      d.prompt,
      (d.config ?? {}) as Record<string, unknown>,
      d.tags,
      d.labels,
      d.commitMessage ?? null
    );
  }
}