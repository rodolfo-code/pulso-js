import { DomainError } from "./domain.error";

export class DomainNotFoundError extends DomainError {
  readonly httpStatus = 404;
}
