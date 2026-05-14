import React from 'react';
import { Card } from '@/shared/components/ui/card';
import { formatUsd, formatBs, formatDate } from '@/shared/utils/format';

import type { ReceiptData } from '@/features/payments/services/receipts.service';

export function DoctorReceiptView({ data }: { data: ReceiptData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">Recibo {data.receiptNumber}</h2>
          <p className="text-sm text-on-surface-variant">
            Generado: {formatDate(data.generatedAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-on-surface-variant">Doctor</p>
          <p className="font-medium text-on-surface">{data.doctorName}</p>
          <p className="text-sm text-on-surface-variant">{data.doctorDocument}</p>
          {data.doctorPhone && (
            <p className="text-sm text-on-surface-variant">{data.doctorPhone}</p>
          )}
        </div>
      </div>

      <Card>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-on-surface-variant">Detalle del recibo</h3>
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

          <div className="mt-3 flex justify-end space-y-0">
            <div className="w-64">
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Total servicio</span>
                <span>{formatUsd(data.totalConsultation)}</span>
              </div>
              <div className="flex justify-between text-sm text-on-surface-variant">
                <span>Porcentaje doctor</span>
                <span>{data.splitPercentage}%</span>
              </div>
              <div className="flex justify-between font-medium text-on-surface mt-2">
                <span>Doctor</span>
                <span>{formatUsd(data.doctorShare)}</span>
              </div>
              <div className="flex justify-between font-medium text-on-surface">
                <span>Centro</span>
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
