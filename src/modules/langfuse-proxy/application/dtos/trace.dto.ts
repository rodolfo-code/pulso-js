export class TraceDto {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly name: string,
    public readonly timestamp: Date,
    public readonly environment: string,
    public readonly tags: string[],
    public readonly bookmarked: boolean,
    public readonly release: string | null,
    public readonly version: string | null,
    public readonly userId: string | null,
    public readonly sessionId: string | null,
    public readonly isPublic: boolean,
    public readonly input: unknown,
    public readonly output: unknown,
    public readonly metadata: Record<string, unknown>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly externalId: string | null,
    public readonly totalCost: number,
    public readonly latency: number | null,
    public readonly htmlPath: string | null,
    public readonly observations: string[],
    public readonly scores: string[]
  ) {}

  static fromLangfuse(d: Record<string, unknown>): TraceDto {
    return new TraceDto(
      String(d["id"] ?? ""),
      String(d["projectId"] ?? ""),
      String(d["name"] ?? ""),
      new Date(String(d["timestamp"])),
      String(d["environment"] ?? "default"),
      Array.isArray(d["tags"]) ? (d["tags"] as string[]) : [],
      Boolean(d["bookmarked"]),
      d["release"] == null ? null : String(d["release"]),
      d["version"] == null ? null : String(d["version"]),
      d["userId"] == null ? null : String(d["userId"]),
      d["sessionId"] == null ? null : String(d["sessionId"]),
      Boolean(d["public"]),
      d["input"],
      d["output"],
      (d["metadata"] as Record<string, unknown>) ?? {},
      new Date(String(d["createdAt"])),
      new Date(String(d["updatedAt"])),
      d["externalId"] == null ? null : String(d["externalId"]),
      typeof d["totalCost"] === "number" ? d["totalCost"] : 0,
      typeof d["latency"] === "number" ? d["latency"] : null,
      d["htmlPath"] == null ? null : String(d["htmlPath"]),
      Array.isArray(d["observations"]) ? (d["observations"] as string[]) : [],
      Array.isArray(d["scores"]) ? (d["scores"] as string[]) : []
    );
  }
}
