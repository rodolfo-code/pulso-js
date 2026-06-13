export class ObservationDto {
  constructor(
    public readonly id: string,
    public readonly traceId: string,
    public readonly type: string,
    public readonly name: string | null,
    public readonly startTime: Date,
    public readonly endTime: Date | null,
    public readonly model: string | null,
    public readonly modelParameters: Record<string, unknown> | null,
    public readonly input: unknown,
    public readonly output: unknown,
    public readonly metadata: Record<string, unknown>,
    public readonly level: string,
    public readonly statusMessage: string | null,
    public readonly parentObservationId: string | null,
    public readonly promptTokens: number | null,
    public readonly completionTokens: number | null,
    public readonly totalTokens: number | null,
    public readonly inputCost: number | null,
    public readonly outputCost: number | null,
    public readonly totalCost: number | null,
    public readonly version: string | null
  ) {}

  static fromLangfuse(d: Record<string, unknown>): ObservationDto {
    return new ObservationDto(
      String(d["id"] ?? ""),
      String(d["traceId"] ?? ""),
      String(d["type"] ?? ""),
      d["name"] == null ? null : String(d["name"]),
      new Date(String(d["startTime"])),
      d["endTime"] == null ? null : new Date(String(d["endTime"])),
      d["model"] == null ? null : String(d["model"]),
      (d["modelParameters"] as Record<string, unknown>) ?? null,
      d["input"],
      d["output"],
      (d["metadata"] as Record<string, unknown>) ?? {},
      String(d["level"] ?? "DEFAULT"),
      d["statusMessage"] == null ? null : String(d["statusMessage"]),
      d["parentObservationId"] == null ? null : String(d["parentObservationId"]),
      typeof d["promptTokens"] === "number" ? d["promptTokens"] : null,
      typeof d["completionTokens"] === "number" ? d["completionTokens"] : null,
      typeof d["totalTokens"] === "number" ? d["totalTokens"] : null,
      typeof d["inputCost"] === "number" ? d["inputCost"] : null,
      typeof d["outputCost"] === "number" ? d["outputCost"] : null,
      typeof d["totalCost"] === "number" ? d["totalCost"] : null,
      d["version"] == null ? null : String(d["version"])
    );
  }
}
