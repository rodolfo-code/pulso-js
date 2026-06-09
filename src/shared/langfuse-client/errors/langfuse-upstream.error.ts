import { DomainError } from "@/shared/domain/errors/domain.error";

export class LangfuseUpstreamError extends DomainError {
  override readonly httpStatus: number;
  override readonly responseBody: unknown;

  constructor(status: number, body: unknown) {
    super(`Langfuse upstream error: ${status}`);
    this.httpStatus = status;
    this.responseBody = body;
  }
}
