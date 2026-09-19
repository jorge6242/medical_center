'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { Select } from '@/shared/components/ui/select';

import { useConsultationTemplateType, usePatientConsultations } from '../hooks/use-medical-records';
import { MedicalRecordDynamicForm } from './medical-record-dynamic-form';

interface MedicalRecordsCreatePanelProps {
  patientId: string;
  initialConsultationId?: string;
  onSuccess?: () => void;
  doctorName?: string;
  patientName?: string;
  specialties?: string[];
}

export function MedicalRecordsCreatePanel({
  patientId,
  initialConsultationId = '',
  onSuccess,
  doctorName,
  patientName,
  specialties,
}: MedicalRecordsCreatePanelProps) {
  const [consultationId, setConsultationId] = useState(initialConsultationId);
  const { data: consultations = [] } = usePatientConsultations(patientId);
  const { data: templateData, isLoading: isTemplateLoading } = useConsultationTemplateType(consultationId);

  useEffect(() => {
    setConsultationId(initialConsultationId);
  }, [initialConsultationId]);

  const templateType = templateData?.templateType;
  const showSelector = !initialConsultationId;
  const hasEligibleConsultations = consultations.length > 0;

  const showMetaHeader = doctorName || patientName || (specialties && specialties.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {showMetaHeader && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface-container p-3 text-sm">
          {patientName && (
            <span className="font-semibold text-on-surface">
              Paciente: <span className="font-normal text-on-surface-variant">{patientName}</span>
            </span>
          )}
          {doctorName && (
            <span className="font-semibold text-on-surface">
              Doctor: <span className="font-normal text-on-surface-variant">{doctorName}</span>
            </span>
          )}
          {specialties && specialties.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {specialties.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {showSelector && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold">Nuevo informe médico</h2>
          <p className="mt-1 text-sm text-on-surface-variant">
            Seleccioná una consulta pagada que todavía no tenga informe médico.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Select
              id="consultationId"
              label="Consulta pagada sin informe"
              value={consultationId}
              onChange={(event) => setConsultationId(event.target.value)}
              options={[
                { value: '', label: 'Seleccionar consulta elegible' },
                ...consultations.map((item) => ({
                  value: item.id,
                  label: `${item.date.slice(0, 10)} · Pagada · ${item.services.map((service) => service.serviceName).join(', ') || 'Sin servicios'}`,
                })),
              ]}
              disabled={!hasEligibleConsultations}
            />
          </div>
          {!hasEligibleConsultations && (
            <p className="mt-3 text-sm text-on-surface-variant">
              No hay consultas pagadas sin informe para este paciente. Para crear un informe,
              primero debe existir una consulta pagada que todavía no tenga informe médico.
            </p>
          )}
        </Card>
      )}

      {consultationId && templateType && !isTemplateLoading ? (
        <MedicalRecordDynamicForm
          patientId={patientId}
          consultationId={consultationId}
          templateType={templateType}
          onSuccess={onSuccess}
        />
      ) : consultationId && isTemplateLoading ? (
        <Card className="p-4 text-sm text-on-surface-variant">
          Cargando o inferiendo la especialidad de la consulta...
        </Card>
      ) : consultationId ? (
        <Card className="p-4 text-sm text-on-surface-variant">
          No se pudo inferir la especialidad de la consulta. Verifique que la especialidad tenga un tipo de plantilla configurado.
        </Card>
      ) : null}
    </div>
  );
}
