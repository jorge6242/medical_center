import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { formatUsd, formatBs, formatDate } from '@/shared/utils/format';

import type { ReceiptData } from '@/features/payments/services/receipts.service';

export function DoctorReceiptView({ data }: { data: ReceiptData }) {
  const centerPercentage = (100 - parseFloat(data.splitPercentage)).toFixed(2);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">
            Recibo de Consulta {data.receiptNumber}
          </h2>
          <p className="text-sm text-on-surface-variant">
            Generado: {formatDate(data.generatedAt)}
          </p>
        </div>
      </div>

      <Card>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-on-surface-variant">Datos del paciente</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-on-surface-variant">Nombre:</span>{' '}
              <span className="font-medium text-on-surface">{data.patientName}</span>
            </div>
            {data.patientDocumentId && (
              <div>
                <span className="text-on-surface-variant">Documento:</span>{' '}
                <span className="text-on-surface">{data.patientDocumentId}</span>
              </div>
            )}
            {data.patientAge !== null && data.patientAge !== undefined && (
              <div>
                <span className="text-on-surface-variant">Edad:</span>{' '}
                <span className="text-on-surface">{data.patientAge} años</span>
              </div>
            )}
            {data.patientPhone && (
              <div>
                <span className="text-on-surface-variant">Teléfono:</span>{' '}
                <span className="text-on-surface">{data.patientPhone}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-on-surface-variant">Datos del médico</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-on-surface-variant">Nombre:</span>{' '}
              <span className="font-medium text-on-surface">{data.doctorName}</span>
            </div>
            <div>
              <span className="text-on-surface-variant">Documento:</span>{' '}
              <span className="text-on-surface">{data.doctorDocument}</span>
            </div>
            {data.doctorSpecialtyName && (
              <div>
                <span className="text-on-surface-variant">Especialidad:</span>{' '}
                <span className="text-on-surface">{data.doctorSpecialtyName}</span>
              </div>
            )}
            {data.doctorPhone && (
              <div>
                <span className="text-on-surface-variant">Teléfono:</span>{' '}
                <span className="text-on-surface">{data.doctorPhone}</span>
              </div>
            )}
            {data.bankName && (
              <div>
                <span className="text-on-surface-variant">Banco:</span>{' '}
                <span className="text-on-surface">{data.bankName}</span>
              </div>
            )}
            {data.accountNumber && (
              <div>
                <span className="text-on-surface-variant">Cuenta:</span>{' '}
                <span className="text-on-surface">{data.accountNumber}</span>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-on-surface-variant">Servicios y especialidad</h3>
          {data.services && data.services.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-on-surface-variant">
                    <th className="pb-2 pr-4">Especialidad</th>
                    <th className="pb-2 pr-4">Servicio</th>
                    <th className="pb-2 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((service, index) => (
                    <tr
                      key={`${service.serviceId}-${index}`}
                      className="border-b border-outline-variant last:border-0"
                    >
                      <td className="py-2 pr-4 text-on-surface-variant">{service.specialtyName}</td>
                      <td className="py-2 pr-4 text-on-surface">{service.serviceName}</td>
                      <td className="py-2 text-right text-on-surface">{formatUsd(service.priceUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">No hay servicios asociados al recibo.</p>
          )}
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-on-surface-variant">Detalle del pago</h3>
          {data.details && data.details.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-on-surface-variant">
                    <th className="pb-2 pr-4">Método</th>
                    <th className="pb-2 pr-4">Moneda</th>
                    <th className="pb-2 pr-4">Monto</th>
                    <th className="pb-2 pr-4">IGTF</th>
                    <th className="pb-2">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.map((d, i) => (
                    <tr key={i} className="border-b border-outline-variant last:border-0">
                      <td className="py-2 pr-4 text-on-surface">{d.paymentMethod}</td>
                      <td className="py-2 pr-4 text-on-surface-variant">{d.currency}</td>
                      <td className="py-2 pr-4 text-on-surface">
                        {d.currency === 'VES' ? formatBs(d.amount) : formatUsd(d.amount)}
                      </td>
                      <td className="py-2 pr-4 text-on-surface-variant">
                        {formatUsd(d.appliedIgtfAmount)}
                      </td>
                      <td className="py-2 text-on-surface-variant">{d.referenceNumber ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">No hay líneas de pago.</p>
          )}

          <div className="mt-3 flex justify-end">
            <div className="w-72 space-y-1">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Total consulta</span>
                <span>{formatUsd(data.totalConsultation)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Porcentaje doctor ({data.splitPercentage}%)</span>
                <span>{formatUsd(data.doctorShare)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Porcentaje centro ({centerPercentage}%)</span>
                <span>{formatUsd(data.centerShare)}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default DoctorReceiptView;
