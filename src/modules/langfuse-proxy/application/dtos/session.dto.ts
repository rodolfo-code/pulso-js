export class SessionDto {
  constructor(
    public readonly id: string,
    public readonly projectId: string,
    public readonly createdAt: Date,
    public readonly bookmarked: boolean,
    public readonly isPublic: boolean,
    public readonly environment: string,
    public readonly traces: Record<string, unknown>[]
  ) {}

  static fromLangfuse(d: Record<string, unknown>): SessionDto {
    return new SessionDto(
      String(d["id"] ?? ""),
      String(d["projectId"] ?? ""),
      new Date(String(d["createdAt"])),
      Boolean(d["bookmarked"]),
      Boolean(d["public"]),
      String(d["environment"] ?? "default"),
      Array.isArray(d["traces"]) ? (d["traces"] as Record<string, unknown>[]) : []
    );
  }
}
