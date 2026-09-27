import { BadRequestException } from '@nestjs/common';

import {
  assertValidConsultationInterval,
  buildIntervalOverlapFilter,
} from './consultation-interval.utils';

describe('consultation interval utilities', () => {
  const startsAt = new Date('2026-10-01T13:00:00.000Z');
  const endsAt = new Date('2026-10-01T14:00:00.000Z');

  it('accepts an interval whose end is after its start', () => {
    expect(() =>
      assertValidConsultationInterval(startsAt, endsAt),
    ).not.toThrow();
  });

  it('rejects zero-length and inverted intervals', () => {
    expect(() => assertValidConsultationInterval(startsAt, startsAt)).toThrow(
      BadRequestException,
    );
    expect(() => assertValidConsultationInterval(endsAt, startsAt)).toThrow(
      'La hora de finalización debe ser posterior a la hora de inicio',
    );
  });

  it('builds the canonical half-open overlap filter', () => {
    expect(buildIntervalOverlapFilter(startsAt, endsAt)).toEqual({
      date: { lt: endsAt },
      endsAt: { gt: startsAt },
    });
  });
});
