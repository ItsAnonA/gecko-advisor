// SPDX-License-Identifier: MIT

/**
 * Throttles database writes for scan progress updates.
 *
 * BullMQ job.updateProgress() can remain frequent (Redis, in-memory),
 * but Prisma writes to PostgreSQL should be throttled to reduce
 * write amplification.
 *
 * A write is allowed when any of these conditions is met:
 *   1. Progress changed by >= `minDelta` points since last write
 *   2. At least `minIntervalMs` milliseconds since last write
 *   3. Progress reaches 100 (always write final state)
 */
export interface ProgressThrottleOptions {
  /** Minimum progress point change to trigger a write (default: 5) */
  minDelta?: number;
  /** Minimum time in ms between writes (default: 3000) */
  minIntervalMs?: number;
  /** Function returning current time in ms -- injectable for testing */
  now?: () => number;
}

export class ProgressThrottle {
  private lastWrittenProgress: number = -1;
  private lastWriteTime: number = 0;

  private readonly minDelta: number;
  private readonly minIntervalMs: number;
  private readonly now: () => number;

  constructor(options: ProgressThrottleOptions = {}) {
    this.minDelta = options.minDelta ?? 5;
    this.minIntervalMs = options.minIntervalMs ?? 3000;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Returns true if the progress value should be written to the database.
   * When it returns true, it also records the write (updates internal state).
   */
  shouldWrite(progress: number): boolean {
    // Always write the final state
    if (progress >= 100) {
      this.record(progress);
      return true;
    }

    const currentTime = this.now();

    // First write -- always allow
    if (this.lastWrittenProgress < 0) {
      this.record(progress);
      return true;
    }

    const deltaPoints = Math.abs(progress - this.lastWrittenProgress);
    const elapsedMs = currentTime - this.lastWriteTime;

    if (deltaPoints >= this.minDelta || elapsedMs >= this.minIntervalMs) {
      this.record(progress);
      return true;
    }

    return false;
  }

  private record(progress: number): void {
    this.lastWrittenProgress = progress;
    this.lastWriteTime = this.now();
  }
}
