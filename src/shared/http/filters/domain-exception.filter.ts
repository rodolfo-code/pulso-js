import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from "@nestjs/common";
import type { Response } from "express";

import { DomainError } from "@/shared/domain/errors/domain.error";

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.warn(
      `${exception.name} (${exception.httpStatus}): ${exception.message}`
    );

    const body = exception.responseBody ?? {
      statusCode: exception.httpStatus,
      message: exception.message,
      error: exception.name
    };

    response.status(exception.httpStatus).json(body);
  }
}
