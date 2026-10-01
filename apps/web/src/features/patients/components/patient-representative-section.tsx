'use client';

import { useState, useEffect } from 'react';
import { useWatch, type Control, type UseFormSetValue, type FieldErrors } from 'react-hook-form';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { Input } from '@/shared/components/ui/input';
import { useLookupRepresentative } from '../hooks/use-patients';
import type { PatientFormData, RepDocType } from './patient-form.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PatientRepresentativeSectionProps {
  control: Control<PatientFormData>;
  setValue: UseFormSetValue<PatientFormData>;
  errors: FieldErrors<PatientFormData>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REP_DOC_TYPE_OPTIONS: { value: RepDocType; label: string }[] = [
  { value: 'V', label: 'V' },
  { value: 'E', label: 'E' },
  { value: 'P', label: 'P' },
];

const RELATIONSHIPS = ['Madre', 'Padre', 'Tutor legal', 'Otro'] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function PatientRepresentativeSection({
  control,
  setValue,
  errors,
}: PatientRepresentativeSectionProps) {
  // Only UI state lives here — the actual field values live in react-hook-form
  const [expanded, setExpanded] = useState(false);

  const repDocType = useWatch({ control, name: 'representative.documentType' }) ?? 'V';
  const repDocId = useWatch({ control, name: 'representative.documentId' }) ?? '';
  const repName = useWatch({ control, name: 'representative.name' }) ?? '';
  const repPhone = useWatch({ control, name: 'representative.phone' }) ?? '';
  const repRelationship = useWatch({ control, name: 'representative.relationship' }) ?? '';

  const { data: repLookup, isFetching: isLookingUp } = useLookupRepresentative(
    repDocType,
    repDocId,
  );

  useEffect(() => {
    if (repLookup?.found && repLookup.representative && repDocId.length >= 6) {
      setValue('representative.name', repLookup.representative.name, { shouldValidate: true });
      setValue('representative.phone', repLookup.representative.phone ?? '', {
        shouldValidate: true,
      });
    }
  }, [repLookup, repDocId, setValue]);

  const repErrors = errors.representative;

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      // Si se colapsa, limpiamos los datos para que Zod no valide un objeto incompleto
      if (!next) {
        setValue('representative', undefined, { shouldValidate: true });
      } else {
        // Al expandir, seteamos el tipo de documento por defecto
        setValue('representative.documentType', 'V');
      }
      return next;
    });
  };

  return (
    <div className="rounded-lg border border-outline-variant">
      <button
        type="button"
        onClick={toggleExpanded}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-on-surface"
      >
        Representante del menor
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-on-surface-variant" />
        ) : (
          <ChevronDown className="h-4 w-4 text-on-surface-variant" />
        )}
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-outline-variant px-4 pb-4 pt-3">
          {/* Tipo + Número de cédula */}
          <div className="flex gap-2">
            <div className="w-24 shrink-0">
              <label className="mb-1 block text-sm font-medium text-on-surface">Tipo</label>
              <select
                value={repDocType}
                onChange={(e) => {
                  setValue('representative.documentType', e.target.value as RepDocType);
                  setValue('representative.documentId', '');
                  setValue('representative.name', '');
                  setValue('representative.phone', '');
                }}
                className="h-10 w-full rounded-lg border border-outline bg-surface px-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {REP_DOC_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-on-surface">
                Número de cédula / pasaporte
              </label>
              <div className="relative">
                <input
                  value={repDocId}
                  onChange={(e) => {
                    setValue('representative.documentId', e.target.value);
                    // Reset pre-filled data when user changes the ID
                    setValue('representative.name', '');
                    setValue('representative.phone', '');
                  }}
                  placeholder="Ej. 15000000"
                  className="h-10 w-full rounded-lg border border-outline bg-surface px-3 pr-9 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {isLookingUp && (
                  <Search className="absolute right-2 top-2.5 h-4 w-4 animate-pulse text-on-surface-variant" />
                )}
              </div>
              {repLookup?.found && (
                <p className="mt-1 text-xs text-primary">
                  ✓ Representante encontrado — datos precargados
                </p>
              )}
              {repLookup && !repLookup.found && repDocId.length >= 6 && (
                <p className="mt-1 text-xs text-on-surface-variant">
                  Representante nuevo — completá los datos
                </p>
              )}
              {repErrors?.documentId && (
                <p className="mt-1 text-xs text-error">{repErrors.documentId.message}</p>
              )}
            </div>
          </div>

          {/* Nombre */}
          <Input
            id="representative.name"
            label="Nombre completo del representante"
            placeholder="María González"
            value={repName}
            onChange={(e) => setValue('representative.name', e.target.value)}
            error={repErrors?.name?.message}
          />

          {/* Teléfono */}
          <Input
            id="representative.phone"
            label="Teléfono (opcional)"
            placeholder="04XX-XXXXXXX"
            value={repPhone}
            onChange={(e) => setValue('representative.phone', e.target.value)}
          />

          {/* Parentesco */}
          <div>
            <label className="mb-1 block text-sm font-medium text-on-surface">Parentesco</label>
            <select
              value={repRelationship}
              onChange={(e) => setValue('representative.relationship', e.target.value)}
              className="h-10 w-full rounded-lg border border-outline bg-surface px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Seleccioná...</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {repErrors?.relationship && (
              <p className="mt-1 text-xs text-error">{repErrors.relationship.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
