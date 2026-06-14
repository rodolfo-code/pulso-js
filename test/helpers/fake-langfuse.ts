import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

export class FakeLangfuseClient extends ILangfuseClient {
  private shouldFail = false;

  setFailure(value: boolean): void {
    this.shouldFail = value;
  }

  async getHealth(): ReturnType<ILangfuseClient["getHealth"]> {
    if (this.shouldFail) {
      throw new Error("fetch failed (fake)");
    }
    return { status: "ok", version: "1.0.0" };
  }

  // Os métodos abaixo não são exercitados pelos testes que usam este fake.
  // Serão sobrescritos por fakes específicos quando necessário.
  getTraces(): ReturnType<ILangfuseClient["getTraces"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getTraces not implemented"));
  }
  getTrace(): ReturnType<ILangfuseClient["getTrace"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getTrace not implemented"));
  }
  getTraceObservations(): ReturnType<ILangfuseClient["getTraceObservations"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getTraceObservations not implemented"));
  }
  getSessions(): ReturnType<ILangfuseClient["getSessions"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getSessions not implemented"));
  }
  getSession(): ReturnType<ILangfuseClient["getSession"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getSession not implemented"));
  }
  getScores(): ReturnType<ILangfuseClient["getScores"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getScores not implemented"));
  }
  createScore(): ReturnType<ILangfuseClient["createScore"]> {
    return Promise.reject(new Error("FakeLangfuseClient.createScore not implemented"));
  }
  getMetricsDaily(): ReturnType<ILangfuseClient["getMetricsDaily"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getMetricsDaily not implemented"));
  }
  getPrompts(): ReturnType<ILangfuseClient["getPrompts"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getPrompts not implemented"));
  }
  getPrompt(): ReturnType<ILangfuseClient["getPrompt"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getPrompt not implemented"));
  }
  createPrompt(): ReturnType<ILangfuseClient["createPrompt"]> {
    return Promise.reject(new Error("FakeLangfuseClient.createPrompt not implemented"));
  }
  deletePrompt(): ReturnType<ILangfuseClient["deletePrompt"]> {
    return Promise.reject(new Error("FakeLangfuseClient.deletePrompt not implemented"));
  }
  getScoreConfigs(): ReturnType<ILangfuseClient["getScoreConfigs"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getScoreConfigs not implemented"));
  }
  createScoreConfig(): ReturnType<ILangfuseClient["createScoreConfig"]> {
    return Promise.reject(new Error("FakeLangfuseClient.createScoreConfig not implemented"));
  }
  getDatasets(): ReturnType<ILangfuseClient["getDatasets"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getDatasets not implemented"));
  }
  createDataset(): ReturnType<ILangfuseClient["createDataset"]> {
    return Promise.reject(new Error("FakeLangfuseClient.createDataset not implemented"));
  }
  getDatasetItems(): ReturnType<ILangfuseClient["getDatasetItems"]> {
    return Promise.reject(new Error("FakeLangfuseClient.getDatasetItems not implemented"));
  }
  createDatasetItem(): ReturnType<ILangfuseClient["createDatasetItem"]> {
    return Promise.reject(new Error("FakeLangfuseClient.createDatasetItem not implemented"));
  }
}