import { renderHook, act } from '@testing-library/react';

import { useConsultationFilters } from './use-consultation-filters';

let mockQuery = 'date=2026-10-19&search=ana&page=3';
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockQuery),
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/consultas',
}));

describe('consultation URL filters', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });
  it('reads URL as truth and reacts to back navigation', () => {
    const { result, rerender } = renderHook(() => useConsultationFilters());
    expect(result.current.query).toEqual({
      date: '2026-10-19',
      search: 'ana',
      page: 3,
      limit: 10,
    });
    mockQuery = 'date=2026-10-18&page=1';
    rerender();
    expect(result.current.query).toMatchObject({
      date: '2026-10-18',
      search: '',
      page: 1,
    });
  });
  it('resets page for filter changes and preserves other filters', () => {
    mockQuery = 'date=2026-10-19&search=ana&page=3';
    const { result } = renderHook(() => useConsultationFilters());
    act(() => result.current.update({ date: '' }));
    expect(mockPush).toHaveBeenCalledWith('/consultas?search=ana', {
      scroll: false,
    });
  });
  it.each(['2026-02-30', 'invalid'])(
    'ignores invalid dates without constructing an API date %s',
    (date) => {
      mockQuery = `date=${date}&page=-1`;
      const { result } = renderHook(() => useConsultationFilters());
      expect(result.current.query).toMatchObject({ date: undefined, page: 1 });
    },
  );
});
