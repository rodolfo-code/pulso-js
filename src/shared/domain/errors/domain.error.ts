export abstract class DomainError extends Error {
  abstract readonly httpStatus: number;
  readonly responseBody?: unknown;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }
}
