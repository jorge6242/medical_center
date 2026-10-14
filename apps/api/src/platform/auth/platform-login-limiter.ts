import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const LIMITS: Record<string, number> = { ip: 20, user: 5 };
const MESSAGE = 'Demasiados intentos. Intentá más tarde.';

interface Counter {
  count: number;
  windowStart: number;
}

// Límite en memoria por proceso. Con varias instancias hay que moverlo a Redis.
@Injectable()
export class PlatformLoginLimiter {
  private readonly counters = new Map<string, Counter>();

  assertAllowed(keys: string[]): void {
    const blocked = keys.some((key) => {
      const counter = this.current(key);
      return counter !== undefined && counter.count >= limitFor(key);
    });
    if (blocked) {
      throw new HttpException(MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  recordFailure(keys: string[]): void {
    const now = Date.now();
    for (const key of keys) {
      const counter = this.current(key);
      if (counter) {
        counter.count += 1;
      } else {
        this.counters.set(key, { count: 1, windowStart: now });
      }
    }
  }

  reset(keys: string[]): void {
    for (const key of keys) this.counters.delete(key);
  }

  private current(key: string): Counter | undefined {
    const counter = this.counters.get(key);
    if (!counter) return undefined;
    if (Date.now() - counter.windowStart >= WINDOW_MS) {
      this.counters.delete(key);
      return undefined;
    }
    return counter;
  }
}

function limitFor(key: string): number {
  const kind = key.split(':')[0] ?? '';
  return LIMITS[kind] ?? LIMITS['user'] ?? 5;
}
