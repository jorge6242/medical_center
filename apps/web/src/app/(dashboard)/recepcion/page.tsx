"use client";

import { useState } from "react";

import { FlaskConical, Stethoscope } from "lucide-react";

import { ConsultationPaymentForm } from "@/features/payments/components/consultation-payment-form";
import { LabOrderForm } from "@/features/lab-orders/components/lab-order-form";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";

export default function RecepcionPage() {
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [showLabOrderModal, setShowLabOrderModal] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-16">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold text-on-surface">Recepción</h1>
        <p className="text-on-surface-variant">
          Selecciona una acción para comenzar
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowConsultationModal(true)}
        >
          <Stethoscope className="h-8 w-8" />
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">Nueva consulta</span>
            <span className="text-xs opacity-80">
              Registrar pago de consulta médica
            </span>
          </div>
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-auto flex-col gap-3 px-8 py-6"
          onClick={() => setShowLabOrderModal(true)}
        >
          <FlaskConical className="h-8 w-8" />
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">
              Orden de laboratorio
            </span>
            <span className="text-xs opacity-80">
              Crear orden de laboratorio
            </span>
          </div>
        </Button>
      </div>

      <Modal
        open={showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        title="Nueva consulta"
        className="max-w-4xl"
      >
        <ConsultationPaymentForm
          onSuccess={() => setShowConsultationModal(false)}
          onCancel={() => setShowConsultationModal(false)}
        />
      </Modal>

      <Modal
        open={showLabOrderModal}
        onClose={() => setShowLabOrderModal(false)}
        title="Nueva orden de laboratorio"
        className="max-w-lg"
      >
        <LabOrderForm
          onSuccess={() => setShowLabOrderModal(false)}
          onCancel={() => setShowLabOrderModal(false)}
        />
      </Modal>
    </div>
  );
}
