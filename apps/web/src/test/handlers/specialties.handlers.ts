import { http, HttpResponse } from 'msw';

import {
  cardioDoctorsFixture,
  pediatriaDoctorsFixture,
  specialtiesFixture,
} from '../fixtures/specialties.fixture';

export const specialtiesHandlers = [
  http.get('*/specialties', () =>
    HttpResponse.json({
      data: specialtiesFixture,
      meta: {
        total: specialtiesFixture.length,
        page: 1,
        limit: 100,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    }),
  ),
  http.get('*/doctors/by-specialty/:specialtyId', ({ params }) => {
    const fixture =
      params['specialtyId'] === cardioDoctorsFixture.specialty.id
        ? cardioDoctorsFixture
        : pediatriaDoctorsFixture;
    return HttpResponse.json(fixture);
  }),
];
