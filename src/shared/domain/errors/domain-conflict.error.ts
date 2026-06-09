import { DomainError } from "./domain.error";

export class DomainConflictError extends DomainError {
  readonly httpStatus = 409;
}
