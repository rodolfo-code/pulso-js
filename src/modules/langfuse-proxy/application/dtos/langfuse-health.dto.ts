export class LangfuseHealthDto {
  constructor(
    public readonly status: string,
    public readonly version: string | null
  ) {}

  static fromLangfuse(d: Record<string, unknown>): LangfuseHealthDto {
    return new LangfuseHealthDto(
      String(d["status"] ?? "unknown"),
      d["version"] == null ? null : String(d["version"])
    );
  }
}
