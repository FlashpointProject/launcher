export class InstancedAbortController {
  current?: AbortController;

  signal() {
    this.current = new AbortController();
    return this.current.signal;
  }

  abort() {
    if (this.current) {
      this.current.abort();
    }
  }
}
