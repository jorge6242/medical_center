'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/shared/utils/cn';

import type { LookupItem } from '../../types/lookup.types';

interface LookupComboboxProps<T extends LookupItem> {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: T[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  canSearch: boolean;
  onQueryChange: (query: string) => void;
  error?: string;
  placeholder?: string;
}

export function LookupCombobox<T extends LookupItem>({
  id,
  label,
  value,
  onChange,
  items,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  canSearch,
  onQueryChange,
  error,
  placeholder = 'Buscar por nombre o cédula…',
}: LookupComboboxProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const selectedItem = items.find((item) => item.id === value);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !open || !hasNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '80px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, open]);

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    onQueryChange(nextQuery);
    setOpen(true);
    if (value) onChange('');
  };

  const handleSelect = (item: T) => {
    onChange(item.id);
    setQuery(item.name);
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-on-surface">
        {label}
      </label>
      <input
        id={id}
        value={query || selectedItem?.name || ''}
        onChange={(event) => handleQueryChange(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'h-10 rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary',
          error && 'border-error focus:ring-error',
        )}
      />
      {error && <p className="text-xs text-error">{error}</p>}
      {open && query.length > 0 && (
        <div className="absolute z-20 mt-[4.5rem] max-h-60 w-full overflow-y-auto rounded-lg border border-outline bg-surface shadow-lg">
          {!canSearch && <p className="p-3 text-sm text-on-surface-variant">Escribí al menos 2 caracteres.</p>}
          {canSearch && isLoading && <p className="p-3 text-sm text-on-surface-variant">Buscando…</p>}
          {canSearch && !isLoading && items.length === 0 && (
            <p className="p-3 text-sm text-on-surface-variant">Sin resultados.</p>
          )}
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelect(item)}
              className="block w-full px-3 py-2 text-left text-sm text-on-surface hover:bg-surface-variant"
            >
              {item.name} ({item.documentType}-{item.documentId})
            </button>
          ))}
          <div ref={loadMoreRef} className="h-1" />
          {isFetchingNextPage && <p className="p-2 text-center text-xs text-on-surface-variant">Cargando más…</p>}
        </div>
      )}
    </div>
  );
}
