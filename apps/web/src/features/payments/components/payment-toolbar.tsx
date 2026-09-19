'use client';

import { Search } from 'lucide-react';

import { DebouncedSearchInput } from '@/shared/components/ui/debounced-search-input';
import { FilterSelect } from '@/shared/components/ui/filter-select';

interface PaymentToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'VOIDED', label: 'Anulado' },
];

export function PaymentToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: PaymentToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative max-w-xs flex-1">
        <DebouncedSearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por paciente o descripción…"
        />
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
      </div>
      <FilterSelect
        value={status}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        placeholder="Todos los estados"
      />
    </div>
  );
}
