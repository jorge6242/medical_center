import { useState } from 'react';

import { Card } from '@/shared/components/ui/card';
import { formatUsd } from '@/shared/utils/format';

interface ServicePrice {
  serviceId: string;
  serviceName: string;
  priceUsd: string;
}

interface SpecialtyCatalog {
  specialtyId: string;
  specialtyName: string;
  services: ServicePrice[];
}

async function getCatalog(): Promise<SpecialtyCatalog[]> {
  const res = await fetch('/api/catalog/services');
  if (!res.ok) throw new Error('Error cargando catálogo');
  return res.json();
}

export default async function CatalogoPage() {
  const catalog = await getCatalog();
  const [filter, setFilter] = useState('');

  const filtered = catalog.filter((s) =>
    s.specialtyName.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-on-surface">Catálogo de Servicios</h1>
        <p className="mt-2 text-on-surface-variant">Consulta nuestros servicios y precios</p>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Filtrar por especialidad..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-outline bg-surface px-4 py-2 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((specialty) => (
          <Card key={specialty.specialtyId} className="flex flex-col">
            <div className="mb-3 border-b border-outline-variant pb-3">
              <h2 className="text-lg font-semibold text-on-surface">{specialty.specialtyName}</h2>
            </div>
            <div className="flex flex-col gap-2">
              {specialty.services.map((service) => (
                <div
                  key={service.serviceId}
                  className="flex items-center justify-between rounded-lg bg-surface-variant px-3 py-2"
                >
                  <span className="text-sm text-on-surface">{service.serviceName}</span>
                  <span className="text-sm font-medium text-primary">{formatUsd(service.priceUsd)}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-on-surface-variant">No se encontraron especialidades</p>
      )}
    </div>
  );
}
