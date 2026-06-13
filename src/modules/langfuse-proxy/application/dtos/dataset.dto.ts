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

  static fromLangfuse(d: Record<string, unknown>): DatasetDto {
    return new DatasetDto(
      String(d["id"] ?? ""),
      String(d["name"] ?? ""),
      d["description"] == null ? null : String(d["description"]),
      (d["metadata"] as Record<string, unknown>) ?? {},
      String(d["projectId"] ?? ""),
      new Date(String(d["createdAt"])),
      new Date(String(d["updatedAt"]))
    );
  }
}
