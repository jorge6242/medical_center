'use client';

import { useState } from 'react';

import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod/v4';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  useCreateSpecialty,
  useDeactivateSpecialty,
  useSpecialties,
} from '@/features/specialties/hooks/use-specialties';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Modal } from '@/shared/components/ui/modal';
import { formatUsd } from '@/shared/utils/format';

const serviceSchema = z.object({
  serviceName: z.string().min(2, 'Requerido'),
  priceUsd: z.number().positive('Precio debe ser positivo'),
});

const schema = z.object({
  name: z.string().min(2, 'Nombre requerido'),
  services: z.array(serviceSchema).min(1, 'Al menos un servicio'),
});

type FormData = z.infer<typeof schema>;

function SpecialtyForm({ onClose }: { readonly onClose: () => void }) {
  const { mutate, isPending, error } = useCreateSpecialty(onClose);
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { services: [{ serviceName: '', priceUsd: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'services' });

  return (
    <form onSubmit={handleSubmit((d) => mutate(d))} className="flex flex-col gap-4">
      <Input {...register('name')} id="name" label="Nombre de especialidad" placeholder="Ginecología" error={errors.name?.message} />

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-on-surface">Servicios</p>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ serviceName: '', priceUsd: 0 })}>
            <Plus className="h-3.5 w-3.5" /> Agregar
          </Button>
        </div>
        {fields.map((field, i) => (
          <div key={field.id} className="flex items-end gap-3 rounded-lg bg-surface-variant p-3">
            <Input {...register(`services.${i}.serviceName`)} label="Servicio" placeholder="Consulta" error={errors.services?.[i]?.serviceName?.message} className="flex-1" />
            <Input {...register(`services.${i}.priceUsd`, { valueAsNumber: true })} label="Precio USD" type="number" step="0.01" placeholder="0.00" error={errors.services?.[i]?.priceUsd?.message} className="w-32" />
            {fields.length > 1 && (
              <button type="button" onClick={() => remove(i)} className="mb-0.5 rounded-lg p-2 text-on-surface-variant hover:text-error">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {errors.services?.message && <p className="text-xs text-error">{errors.services.message}</p>}
      </div>

      {error && <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">{error.message}</p>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" isLoading={isPending}>Crear especialidad</Button>
      </div>
    </form>
  );
}

export default function EspecialidadesPage() {
  const { data: specialties = [], isLoading } = useSpecialties();
  const { mutate: deactivate } = useDeactivateSpecialty();
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Especialidades</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" /> Nueva especialidad
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-variant" />)}</div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {specialties.map((s) => (
              <div key={s.id}>
                <div className="flex items-center justify-between py-3">
                  <button type="button" onClick={() => toggle(s.id)} className="flex items-center gap-2 text-left">
                    {expanded.has(s.id) ? <ChevronDown className="h-4 w-4 text-on-surface-variant" /> : <ChevronRight className="h-4 w-4 text-on-surface-variant" />}
                    <span className="font-medium text-on-surface">{s.name}</span>
                    <Badge variant="default">{s.services.length} servicios</Badge>
                  </button>
                  <Button variant="ghost" size="sm" onClick={() => deactivate(s.id)} className="text-error hover:text-error">
                    Desactivar
                  </Button>
                </div>
                {expanded.has(s.id) && (
                  <div className="mb-3 ml-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-on-surface-variant">
                          <th className="pb-2 pr-4 font-medium">Servicio</th>
                          <th className="pb-2 font-medium">Precio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.services.map((sp) => (
                          <tr key={sp.id} className="border-t border-outline-variant">
                            <td className="py-2 pr-4 text-on-surface">{sp.serviceName}</td>
                            <td className="py-2 text-on-surface-variant">{formatUsd(sp.priceUsd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
            {specialties.length === 0 && !isLoading && (
              <p className="py-8 text-center text-on-surface-variant">No hay especialidades registradas</p>
            )}
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva especialidad">
        <SpecialtyForm onClose={() => setShowModal(false)} />
      </Modal>
    </div>
  );
}
