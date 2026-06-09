import { DomainError } from "./domain.error";

export class DomainValidationError extends DomainError {
  readonly httpStatus = 400;
}
