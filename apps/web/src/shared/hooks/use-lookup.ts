'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { useDebouncedValue } from './use-debounced-value';
import type { LookupItem, LookupResponse } from '../types/lookup.types';

type LookupFetcher<T extends LookupItem> = (query: string, cursor: string | null) => Promise<LookupResponse<T>>;

export function useLookup<T extends LookupItem>(
  queryKey: string,
  query: string,
  fetchLookup: LookupFetcher<T>,
) {
  const debouncedQuery = useDebouncedValue(query.trim(), 300);
  const result = useInfiniteQuery({
    queryKey: [queryKey, debouncedQuery],
    queryFn: ({ pageParam }) => fetchLookup(debouncedQuery, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: debouncedQuery.length >= 2,
  });

  return {
    ...result,
    items: result.data?.pages.flatMap((page) => page.data) ?? [],
    canSearch: debouncedQuery.length >= 2,
  };
}
