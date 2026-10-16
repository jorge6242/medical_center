import { http, HttpResponse } from 'msw';

import { homeStatsFixture } from '../fixtures/home-stats.fixture';

export const statsHandlers = [http.get('*/stats/home', () => HttpResponse.json(homeStatsFixture))];
