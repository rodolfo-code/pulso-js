import { UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";

import { ApiKeyGuard } from "@/shared/auth/api-key.guard";
import type { EnvConfig } from "@/shared/config/env.config";

const VALID_KEY = "valid-test-api-key";

function makeGuard(isPublic: boolean): ApiKeyGuard {
  const reflector = {
    getAllAndOverride: () => isPublic
  } as unknown as Reflector;

  const config = {
    getOrThrow: () => VALID_KEY
  } as unknown as ConfigService<EnvConfig, true>;

  return new ApiKeyGuard(reflector, config);
}

function makeContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ headers })
    })
  } as unknown as ExecutionContext;
}

describe("ApiKeyGuard", () => {
  it("allows route marked @Public regardless of header", () => {
    expect(makeGuard(true).canActivate(makeContext({}))).toBe(true);
  });

  it("rejects request with no x-api-key header", () => {
    expect(() => makeGuard(false).canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it("rejects request with empty x-api-key header", () => {
    expect(() => makeGuard(false).canActivate(makeContext({ "x-api-key": "" }))).toThrow(
      UnauthorizedException
    );
  });

  it("rejects request with wrong x-api-key value", () => {
    expect(() =>
      makeGuard(false).canActivate(makeContext({ "x-api-key": "wrong-key" }))
    ).toThrow(UnauthorizedException);
  });

  it("rejects header with different length than expected", () => {
    expect(() =>
      makeGuard(false).canActivate(makeContext({ "x-api-key": "short" }))
    ).toThrow(UnauthorizedException);
  });

  it("accepts request with exact matching x-api-key", () => {
    expect(makeGuard(false).canActivate(makeContext({ "x-api-key": VALID_KEY }))).toBe(true);
  });
});