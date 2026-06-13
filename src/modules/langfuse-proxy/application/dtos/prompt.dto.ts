export class PromptDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly version: number,
    public readonly type: string,
    public readonly prompt: unknown,
    public readonly config: Record<string, unknown>,
    public readonly tags: string[],
    public readonly labels: string[],
    public readonly commitMessage: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromLangfuse(d: Record<string, unknown>): PromptDto {
    return new PromptDto(
      String(d["id"] ?? ""),
      String(d["name"] ?? ""),
      typeof d["version"] === "number" ? d["version"] : 0,
      String(d["type"] ?? "text"),
      d["prompt"],
      (d["config"] as Record<string, unknown>) ?? {},
      Array.isArray(d["tags"]) ? (d["tags"] as string[]) : [],
      Array.isArray(d["labels"]) ? (d["labels"] as string[]) : [],
      d["commitMessage"] == null ? null : String(d["commitMessage"]),
      new Date(String(d["createdAt"])),
      new Date(String(d["updatedAt"]))
    );
  }
}
