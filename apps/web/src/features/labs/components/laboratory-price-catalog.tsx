'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { useLaboratoryCatalog } from '../hooks/use-labs';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { formatUsd } from '@/shared/utils/format';

export function LaboratoryPriceCatalog({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const { data: tests = [], isLoading, isError } = useLaboratoryCatalog();
  const filteredTests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return tests;
    return tests.filter((test) => test.name.toLowerCase().includes(normalizedSearch));
  }, [search, tests]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          label="Buscar examen"
          placeholder="Ej. Hematología"
        />
        <Search className="pointer-events-none absolute bottom-3 right-3 h-4 w-4 text-on-surface-variant" />
      </div>

      <div className="max-h-80 overflow-y-auto rounded-lg border border-outline">
        {isLoading && (
          <div className="space-y-3 p-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-10 animate-pulse rounded bg-surface-variant" />
            ))}
          </div>
        )}
        {isError && <p className="p-4 text-sm text-error">No se pudieron cargar los precios.</p>}
        {!isLoading && !isError && filteredTests.length === 0 && (
          <p className="p-4 text-sm text-on-surface-variant">No se encontraron exámenes.</p>
        )}
        {!isLoading && !isError && filteredTests.length > 0 && (
          <ul className="divide-y divide-outline-variant">
            {filteredTests.map((test) => (
              <li key={test.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-on-surface">{test.name}</span>
                <span className="whitespace-nowrap text-sm font-semibold text-primary">
                  {formatUsd(test.priceUsd)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );
}
