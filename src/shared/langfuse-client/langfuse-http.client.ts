import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvConfig } from "@/shared/config/env.config";

import { ILangfuseClient } from "./interfaces/langfuse-client.interface";

@Injectable()
export class LangfuseHttpClient extends ILangfuseClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    super();
    this.baseUrl = config.getOrThrow<string>("langfuseBaseUrl");
  }

  async getHealth(): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseUrl}/api/public/health`, {
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`Langfuse health check failed: ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}