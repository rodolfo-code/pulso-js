import type { ApiHealthResponse } from "langfuse";

export class LangfuseHealthDto {
  constructor(
    public readonly status: string,
    public readonly version: string
  ) {}

  static fromLangfuse(d: ApiHealthResponse): LangfuseHealthDto {
    return new LangfuseHealthDto(d.status, d.version);
  }
}