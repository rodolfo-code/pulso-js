export class FakePrismaService {
  private shouldFail = false;

  setFailure(value: boolean): void {
    this.shouldFail = value;
  }

  async ping(): Promise<void> {
    if (this.shouldFail) {
      throw new Error("ECONNREFUSED (fake)");
    }
  }
}