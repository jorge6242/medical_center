"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { FileDown } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { formatDate, formatUsd } from "@/shared/utils/format";
import type { PaymentResponse } from "../services/payments.service";

function statusVariant(status: string) {
  if (status === "COMPLETED") return "success";
  if (status === "VOIDED") return "error";
  return "warning";
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    COMPLETED: "Completado",
    VOIDED: "Anulado",
    PROCESSING: "Procesando",
    INITIATED: "Iniciado",
  };
  return map[status] ?? status;
}

function itemTypeLabel(itemType: string) {
  return itemType === "CONSULTATION" ? "Consulta" : "Laboratorio";
}

function itemTypeVariant(itemType: string) {
  return itemType === "CONSULTATION" ? "success" : "secondary";
}

export function getPaymentColumns(): ColumnDef<PaymentResponse>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-on-surface-variant">
          {row.original.id.slice(0, 8)}…
        </span>
      ),
    },
    {
      accessorKey: "item.itemType",
      header: "Tipo",
      cell: ({ row }) => (
        <Badge
          variant={itemTypeVariant(
            row.original.item?.itemType ?? "CONSULTATION",
          )}
        >
          {itemTypeLabel(row.original.item?.itemType ?? "CONSULTATION")}
        </Badge>
      ),
    },
    {
      accessorKey: "totalServiceUsd",
      header: "Total servicio",
      cell: ({ row }) => (
        <span className="font-medium text-on-surface">
          {formatUsd(row.original.totalServiceUsd)}
        </span>
      ),
    },
    {
      accessorKey: "totalPaidUsdEquivalent",
      header: "Total pagado USD",
      cell: ({ row }) => formatUsd(row.original.totalPaidUsdEquivalent),
    },
    {
      accessorKey: "totalIgtfUsd",
      header: "IGTF",
      cell: ({ row }) => formatUsd(row.original.totalIgtfUsd),
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={statusVariant(row.original.status)}>
          {statusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row, table }) => {
        const meta = table.options.meta as
          | {
              onDownloadReceipt?: (payment: PaymentResponse) => void;
              onViewReceipt?: (payment: PaymentResponse) => void;
              onVoid?: (payment: PaymentResponse) => void;
              onAdjustments?: (payment: PaymentResponse) => void;
              onCreateMedicalRecord?: (payment: PaymentResponse) => void;
            }
          | undefined;
        const payment = row.original;

        return (
          <div className="flex items-center gap-1">
            {payment.status === "COMPLETED" &&
              payment.item?.itemType === "CONSULTATION" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => meta?.onDownloadReceipt?.(payment)}
                  title="Descargar recibo"
                >
                  <FileDown className="h-4 w-4" />
                </Button>
              )}
            {payment.status === "COMPLETED" &&
              payment.item?.itemType === "CONSULTATION" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => meta?.onViewReceipt?.(payment)}
                >
                  Ver
                </Button>
              )}
            {payment.status === "COMPLETED" &&
              payment.item?.itemType === "CONSULTATION" &&
              payment.item.patientId &&
              payment.item.consultationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => meta?.onCreateMedicalRecord?.(payment)}
                >
                  Informe
                </Button>
              )}
            {payment.status === "COMPLETED" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-error hover:text-error"
                onClick={() => meta?.onVoid?.(payment)}
              >
                Anular
              </Button>
            )}
            {payment.status === "COMPLETED" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => meta?.onAdjustments?.(payment)}
              >
                Ajustes
              </Button>
            )}
          </div>
        );
      },
    },
  ];
}
