import {
  ILangfuseClient,
  type LangfuseEntity,
  type LangfuseList
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

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

  // Métodos abaixo não são exercitados pelos testes atuais (only getHealth).
  // Serão sobrescritos por fakes específicos quando os testes do langfuse-proxy chegarem.
  getTraces(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getTraces not implemented"));
  }
  getTrace(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.getTrace not implemented"));
  }
  getTraceObservations(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getTraceObservations not implemented"));
  }
  getSessions(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getSessions not implemented"));
  }
  getSession(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.getSession not implemented"));
  }
  getScores(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getScores not implemented"));
  }
  createScore(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.createScore not implemented"));
  }
  getMetricsDaily(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.getMetricsDaily not implemented"));
  }
  getPrompts(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getPrompts not implemented"));
  }
  getPrompt(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.getPrompt not implemented"));
  }
  createPrompt(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.createPrompt not implemented"));
  }
  deletePrompt(): Promise<void> {
    return Promise.reject(new Error("FakeLangfuseClient.deletePrompt not implemented"));
  }
  getScoreConfigs(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getScoreConfigs not implemented"));
  }
  createScoreConfig(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.createScoreConfig not implemented"));
  }
  getDatasets(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getDatasets not implemented"));
  }
  createDataset(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.createDataset not implemented"));
  }
  getDatasetItems(): Promise<LangfuseList> {
    return Promise.reject(new Error("FakeLangfuseClient.getDatasetItems not implemented"));
  }
  createDatasetItem(): Promise<LangfuseEntity> {
    return Promise.reject(new Error("FakeLangfuseClient.createDatasetItem not implemented"));
  }
}
