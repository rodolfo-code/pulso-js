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

  static fromLangfuse(d: Record<string, unknown>): DatasetItemDto {
    return new DatasetItemDto(
      String(d["id"] ?? ""),
      String(d["datasetId"] ?? ""),
      String(d["datasetName"] ?? ""),
      d["input"],
      d["expectedOutput"],
      (d["metadata"] as Record<string, unknown>) ?? {},
      d["sourceTraceId"] == null ? null : String(d["sourceTraceId"]),
      d["sourceObservationId"] == null ? null : String(d["sourceObservationId"]),
      String(d["status"] ?? "ACTIVE"),
      new Date(String(d["createdAt"])),
      new Date(String(d["updatedAt"]))
    );
  }
}
