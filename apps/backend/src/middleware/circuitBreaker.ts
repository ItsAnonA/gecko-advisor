/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/

/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascading failures by failing fast when a service is degraded.
 * Wraps the FULL report generation pipeline (DB + aggregation + template).
 *
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Too many failures, use fallback immediately
 * - HALF-OPEN: After timeout, try one request to test recovery
 */

import { logger } from '../logger.js';

interface CircuitBreakerOptions {
  name: string;
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Milliseconds before trying again (half-open)
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private lastFailureTime: number | null = null;
  private readonly options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  /**
   * Execute a function with circuit breaker protection.
   *
   * @param fn - Function to execute
   * @param fallback - Fallback function if circuit is open or execution fails
   * @returns Result from fn() or fallback()
   */
  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    // Check if circuit should transition from OPEN → HALF_OPEN
    if (this.state === CircuitState.OPEN && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure >= this.options.resetTimeout) {
        logger.info(
          { breaker: this.options.name },
          `Circuit breaker transitioning OPEN → HALF_OPEN (timeout reset)`
        );
        this.state = CircuitState.HALF_OPEN;
      }
    }

    // Circuit is OPEN: use fallback immediately
    if (this.state === CircuitState.OPEN) {
      logger.warn(
        { breaker: this.options.name, failures: this.failures },
        `Circuit breaker is OPEN, using fallback`
      );
      return fallback();
    }

    // Try executing the function
    try {
      const result = await fn();

      // Success: reset failure count and close circuit
      if (this.state === CircuitState.HALF_OPEN) {
        logger.info({ breaker: this.options.name }, `Circuit breaker HALF_OPEN → CLOSED (success)`);
      }

      this.state = CircuitState.CLOSED;
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      logger.error(
        {
          breaker: this.options.name,
          failures: this.failures,
          threshold: this.options.failureThreshold,
          error: error instanceof Error ? error.message : String(error),
        },
        `Circuit breaker recorded failure`
      );

      // Check if we should open the circuit
      if (this.failures >= this.options.failureThreshold) {
        this.state = CircuitState.OPEN;
        logger.error(
          { breaker: this.options.name, failures: this.failures },
          `Circuit breaker opened! Too many failures.`
        );
      }

      // Use fallback
      return fallback();
    }
  }

  /**
   * Get current circuit breaker state (for monitoring).
   */
  getState(): {
    state: CircuitState;
    failures: number;
    threshold: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      threshold: this.options.failureThreshold,
    };
  }

  /**
   * Manually reset the circuit breaker (for admin/testing).
   */
  reset(): void {
    logger.info({ breaker: this.options.name }, `Circuit breaker manually reset`);
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = null;
  }
}

/**
 * Circuit breaker for the full report generation pipeline.
 *
 * Protects against:
 * - Database failures
 * - Worker queue failures
 * - Template rendering failures
 * - Aggregation logic failures
 *
 * Fallback: Return null, which triggers placeholder page
 */
export const reportCircuitBreaker = new CircuitBreaker({
  name: 'report-generation',
  failureThreshold: 5, // Open circuit after 5 failures
  resetTimeout: 60000, // Try again after 1 minute
});
