import { http, HttpResponse } from 'msw';

import { doctorLookupItemsFixture, doctorServicesFixture } from '../fixtures/doctors.fixture';
import { patientLookupItemsFixture } from '../fixtures/patients.fixture';

const emptyPage = { nextCursor: null, hasNextPage: false };

export const lookupsHandlers = [
  http.get('*/patients/lookup', () =>
    HttpResponse.json({ data: patientLookupItemsFixture, ...emptyPage }),
  ),
  http.get('*/doctors/lookup', () =>
    HttpResponse.json({ data: doctorLookupItemsFixture, ...emptyPage }),
  ),
  http.get('*/doctors/:doctorId/services', () => HttpResponse.json(doctorServicesFixture)),
];
