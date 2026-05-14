'use client';

import { useEffect, useState } from 'react';

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

interface LaboratoryTest {
  labTestId: string;
  testName: string;
  priceUsd: string;
}

type CatalogView = 'specialties' | 'laboratories';

async function getServices(): Promise<SpecialtyCatalog[]> {
  const res = await fetch('/api/catalog/services');
  if (!res.ok) throw new Error('Error cargando servicios');
  return res.json();
}

async function getLaboratories(): Promise<LaboratoryTest[]> {
  const res = await fetch('/api/catalog/laboratories');
  if (!res.ok) throw new Error('Error cargando laboratorios');
  return res.json();
}

export default function CatalogoPage() {
  const [view, setView] = useState<CatalogView>('specialties');
  const [filter, setFilter] = useState('');
  const [specialties, setSpecialties] = useState<SpecialtyCatalog[]>([]);
  const [laboratories, setLaboratories] = useState<LaboratoryTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [servicesData, labsData] = await Promise.all([
          getServices(),
          getLaboratories(),
        ]);
        setSpecialties(servicesData);
        setLaboratories(labsData);
      } catch {
        setError('Error cargando el catálogo');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredSpecialties = specialties.filter((s) =>
    s.specialtyName.toLowerCase().includes(filter.toLowerCase()),
  );

  const filteredLaboratories = laboratories.filter((l) =>
    l.testName.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-on-surface">Catálogo de Servicios</h1>
        <p className="mt-2 text-on-surface-variant">Consulta nuestros servicios y precios</p>
      </div>

      {/* View Toggle */}
      <div className="mb-6 flex justify-center gap-2">
        <button
          onClick={() => setView('specialties')}
          className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
            view === 'specialties'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface'
          }`}
        >
          Especialidades
        </button>
        <button
          onClick={() => setView('laboratories')}
          className={`rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
            view === 'laboratories'
              ? 'bg-primary text-on-primary'
              : 'bg-surface-variant text-on-surface-variant hover:bg-surface'
          }`}
        >
          Laboratorios
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder={view === 'specialties' ? 'Filtrar por especialidad...' : 'Filtrar por test...'}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full rounded-lg border border-outline bg-surface px-4 py-2 text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
        />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-surface-variant" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <p className="py-12 text-center text-error">{error}</p>
      )}

      {/* Specialties View */}
      {!loading && !error && view === 'specialties' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSpecialties.map((specialty) => (
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
      )}

      {/* Laboratories View */}
      {!loading && !error && view === 'laboratories' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                  <th className="pb-3 pr-4 font-medium">Test</th>
                  <th className="pb-3 pr-4 font-medium">Precio</th>
                </tr>
              </thead>
              <tbody>
                {filteredLaboratories.map((test) => (
                  <tr key={test.labTestId} className="border-b border-outline-variant last:border-0">
                    <td className="py-3 pr-4 text-on-surface">{test.testName}</td>
                    <td className="py-3 pr-4 font-medium text-primary">{formatUsd(test.priceUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {!loading && !error && ((view === 'specialties' && filteredSpecialties.length === 0) ||
        (view === 'laboratories' && filteredLaboratories.length === 0)) && (
        <p className="py-12 text-center text-on-surface-variant">
          No se encontraron resultados
        </p>
      )}
    </div>
  );
}
