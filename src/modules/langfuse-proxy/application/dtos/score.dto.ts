export class ScoreDto {
  constructor(
    public readonly id: string,
    public readonly traceId: string,
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

  static fromLangfuse(d: Record<string, unknown>): ScoreDto {
    const rawValue = d["value"];
    const value: number | string | null =
      typeof rawValue === "number" || typeof rawValue === "string"
        ? rawValue
        : rawValue == null
          ? null
          : String(rawValue);

    return new ScoreDto(
      String(d["id"] ?? ""),
      String(d["traceId"] ?? ""),
      String(d["name"] ?? ""),
      value,
      String(d["source"] ?? ""),
      String(d["dataType"] ?? ""),
      d["comment"] == null ? null : String(d["comment"]),
      d["observationId"] == null ? null : String(d["observationId"]),
      d["configId"] == null ? null : String(d["configId"]),
      new Date(String(d["createdAt"])),
      new Date(String(d["updatedAt"]))
    );
  }
}
