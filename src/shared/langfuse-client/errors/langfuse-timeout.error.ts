import { DomainError } from "@/shared/domain/errors/domain.error";

export class LangfuseTimeoutError extends DomainError {
  readonly httpStatus = 504;

  constructor(cause?: unknown) {
    super("Langfuse timeout", cause === undefined ? undefined : { cause });
  }
}
