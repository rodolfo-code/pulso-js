import { DomainError } from "@/shared/domain/errors/domain.error";

export class LangfuseUnavailableError extends DomainError {
  readonly httpStatus = 502;

  constructor(cause?: unknown) {
    super("Langfuse unavailable", cause === undefined ? undefined : { cause });
  }
}
