import { screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';

import { renderWithClient } from '@/test/render';
import { server } from '@/test/server';

import { usePaidConsultations } from './use-medical-records';

function Probe({ date }: { date: string }) {
  const { data } = usePaidConsultations({ date, page: 2, limit: 10, search: 'Ana' });
  return <p>{data?.meta.total ?? 'loading'}</p>;
}

it('sends all URL filters to the API and caches different dates separately', async () => {
  const requests: URL[] = [];
  server.use(
    http.get('*/medical-records/paid-consultations', ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      return HttpResponse.json({
        data: [],
        meta: { total: url.searchParams.get('date') === '2026-10-19' ? 1 : 2 },
      });
    }),
  );
  const first = renderWithClient(<Probe date="2026-10-19" />);
  await screen.findByText('1');
  expect(Object.fromEntries(requests[0]?.searchParams ?? [])).toEqual({
    date: '2026-10-19',
    page: '2',
    limit: '10',
    search: 'Ana',
  });
  first.rerender(
    <QueryClientProvider client={first.queryClient}>
      <Probe date="2026-10-19" />
      <Probe date="2026-10-20" />
    </QueryClientProvider>,
  );
  await screen.findByText('2');
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(
    first.queryClient.getQueryData([
      'medical-records',
      'paid-consultations',
      2,
      10,
      'Ana',
      '2026-10-19',
    ]),
  ).toBeDefined();
});
