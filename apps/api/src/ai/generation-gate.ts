import { Injectable } from '@nestjs/common';
import { AiProviderError } from './ai.errors';

// Kept tight by default — this is an admin-only feature, not high-volume traffic.
// Raise via env if you actually need more throughput.
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_GENERATIONS) || 1;
const MAX_PER_DAY = Number(process.env.MAX_GENERATIONS_PER_DAY) || 10;

/**
 * Spend protection. Caps concurrent generations and generations per UTC day
 * (in-memory — a restart resets the day counter, which is fine for a
 * single-instance API and still bounds the blast radius of a leaked/abused
 * generate endpoint).
 */
@Injectable()
export class GenerationGate {
  private inFlight = 0;
  private day = '';
  private count = 0;

  constructor(
    private readonly maxConcurrent = MAX_CONCURRENT,
    private readonly maxPerDay = MAX_PER_DAY,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Reserves a slot (or throws). The caller MUST call the returned release() exactly once. */
  acquire(): () => void {
    const today = this.now().toISOString().slice(0, 10);
    if (today !== this.day) {
      this.day = today;
      this.count = 0;
    }
    if (this.count >= this.maxPerDay) {
      throw new AiProviderError('daily_limit', 'Daily article generation limit reached.', false);
    }
    if (this.inFlight >= this.maxConcurrent) {
      throw new AiProviderError('busy', 'Too many generations in progress. Try again shortly.', true);
    }
    this.inFlight++;
    this.count++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.inFlight--;
      }
    };
  }
}
