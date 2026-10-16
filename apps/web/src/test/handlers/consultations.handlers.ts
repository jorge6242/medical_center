import { http, HttpResponse } from 'msw';

export const consultationsHandlers = [
  http.get('*/consultations/availability', () =>
    HttpResponse.json({ occupiedSlots: [], isRequestedSlotAvailable: true }),
  ),
];
