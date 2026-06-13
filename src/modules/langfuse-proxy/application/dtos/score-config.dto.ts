export class ScoreConfigDto {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly dataType: string,
    public readonly isArchived: boolean,
    public readonly minValue: number | null,
    public readonly maxValue: number | null,
    public readonly categories: Record<string, unknown>[] | null,
    public readonly description: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  static fromLangfuse(d: Record<string, unknown>): ScoreConfigDto {
    return new ScoreConfigDto(
      String(d["id"] ?? ""),
      String(d["name"] ?? ""),
      String(d["dataType"] ?? ""),
      Boolean(d["isArchived"]),
      typeof d["minValue"] === "number" ? d["minValue"] : null,
      typeof d["maxValue"] === "number" ? d["maxValue"] : null,
      Array.isArray(d["categories"]) ? (d["categories"] as Record<string, unknown>[]) : null,
      d["description"] == null ? null : String(d["description"]),
      new Date(String(d["createdAt"])),
      new Date(String(d["updatedAt"]))
    );
  }
}
