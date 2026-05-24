export class TokenBucket {
  private tokens: number;
  private lastRefill: number = Date.now();
  private waiters: Array<() => void> = [];

  constructor(
    private bytesPerSecond: number,
    private burstSize?: number
  ) {
    this.tokens = burstSize ?? bytesPerSecond;
  }

  public setRate(bytesPerSecond: number): void {
    this.bytesPerSecond = bytesPerSecond;
    this.tokens = Math.min(this.tokens, this.burstSize ?? bytesPerSecond);
    // Wake any waiters — they'll re-check availability
    this.refreshWaiters();
  }

  /** Wait for X tokens available */
  public async acquire(bytes: number, signal?: AbortSignal): Promise<void> {
    if (this.bytesPerSecond === 0)
    {
      // Unlimited if 0
      return;
    }

    while (true) {
      this.refill();

      if (this.tokens >= bytes) {
        this.tokens -= bytes;
        return;
      }

      // Wait until enough tokens are available
      const msNeeded = ((bytes - this.tokens) / this.bytesPerSecond) * 1000;
      await this.waitFor(Math.ceil(msNeeded), signal);

      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
    }
  }

  // Add any newly available tokens based on time
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const burst = this.burstSize ?? this.bytesPerSecond;
    this.tokens = Math.min(burst, this.tokens + elapsed * this.bytesPerSecond);
    this.lastRefill = now;
  }

  private waitFor(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      this.waiters.push(() => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve();
      });
    });
  }

  // Force a recheck for the waiter
  private refreshWaiters(): void {
    const w = this.waiters.splice(0);
    w.forEach(fn => fn());
  }
}
