export abstract class ILangfuseClient {
  abstract getHealth(): Promise<void>;
}