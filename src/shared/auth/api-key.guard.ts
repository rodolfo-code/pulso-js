import { timingSafeEqual } from "node:crypto";

import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";

import type { EnvConfig } from "@/shared/config/env.config";

import { IS_PUBLIC_KEY } from "./public.decorator";

const API_KEY_HEADER = "x-api-key";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService<EnvConfig, true>
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[API_KEY_HEADER];

    if (typeof provided !== "string" || provided.length === 0) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    const expected = this.config.getOrThrow<string>("observatoryApiKey");

    if (!this.safeEqual(provided, expected)) {
      throw new UnauthorizedException("Invalid or missing API key");
    }

    return true;
  }

  private safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");

    if (aBuf.length !== bBuf.length) {
      return false;
    }

    return timingSafeEqual(aBuf, bBuf);
  }
}