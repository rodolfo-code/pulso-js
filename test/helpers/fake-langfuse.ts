import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

export class FakeLangfuseClient extends ILangfuseClient {
  private shouldFail = false;

  setFailure(value: boolean): void {
    this.shouldFail = value;
  }

  async getHealth(): Promise<void> {
    if (this.shouldFail) {
      throw new Error("fetch failed (fake)");
    }
  }
}