import { HttpException, HttpStatus } from '@nestjs/common';

import { PlatformLoginLimiter } from './platform-login-limiter';

const WINDOW_MS = 15 * 60 * 1000;

describe('PlatformLoginLimiter', () => {
  let limiter: PlatformLoginLimiter;
  let now: number;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    limiter = new PlatformLoginLimiter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('blocks an account after five failures in the window with 429', () => {
    for (let i = 0; i < 5; i++) {
      limiter.assertAllowed(['user:exiadmin']);
      limiter.recordFailure(['user:exiadmin']);
    }

    try {
      limiter.assertAllowed(['user:exiadmin']);
      throw new Error('expected block');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('allows again once the window has elapsed', () => {
    for (let i = 0; i < 5; i++) limiter.recordFailure(['user:exiadmin']);

    now += WINDOW_MS + 1;

    expect(() => limiter.assertAllowed(['user:exiadmin'])).not.toThrow();
  });

  it('blocks an IP after twenty failures even across accounts', () => {
    for (let i = 0; i < 20; i++) {
      limiter.recordFailure(['ip:10.0.0.1', `user:cuenta-${i}`]);
    }

    expect(() =>
      limiter.assertAllowed(['ip:10.0.0.1', 'user:otra-cuenta']),
    ).toThrow(HttpException);
    expect(() => limiter.assertAllowed(['ip:10.0.0.2'])).not.toThrow();
  });

  it('clears the account counter after a successful login', () => {
    for (let i = 0; i < 4; i++) limiter.recordFailure(['user:exiadmin']);

    limiter.reset(['user:exiadmin']);
    limiter.recordFailure(['user:exiadmin']);

    expect(() => limiter.assertAllowed(['user:exiadmin'])).not.toThrow();
  });
});
