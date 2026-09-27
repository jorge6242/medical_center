import { BadRequestException } from '@nestjs/common';

export function assertValidConsultationInterval(
  startsAt: Date,
  endsAt: Date,
): void {
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new BadRequestException(
      'La hora de finalización debe ser posterior a la hora de inicio',
    );
  }
}

export function buildIntervalOverlapFilter(startsAt: Date, endsAt: Date) {
  return {
    date: { lt: endsAt },
    endsAt: { gt: startsAt },
  };
}
