'use client';

import { Search } from 'lucide-react';

import { DebouncedSearchInput } from '@/shared/components/ui/debounced-search-input';
import { FilterSelect } from '@/shared/components/ui/filter-select';

interface LabOrdersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'VOIDED', label: 'Anulada' },
];

export function LabOrdersToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: LabOrdersToolbarProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative max-w-xs flex-1">
        <DebouncedSearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por paciente, documento, ID o test…"
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
