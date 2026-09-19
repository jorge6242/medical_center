'use client';

import { Search } from 'lucide-react';

import { DebouncedSearchInput } from '@/shared/components/ui/debounced-search-input';

interface DoctorToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function DoctorToolbar({ search, onSearchChange }: DoctorToolbarProps) {
  return (
    <div className="relative max-w-xs">
      <DebouncedSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por nombre, cédula, licencia o especialidad…"
      />
      <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
    </div>
  );
}
