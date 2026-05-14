'use client';

import { useQueueStatuses } from '@/features/queues/hooks/use-queues';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';

export default function QueuesPage() {
  const { data: queues = [], isLoading } = useQueueStatuses();
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Colas</h1>
          <p className="text-sm text-on-surface-variant">Métricas básicas de BullMQ para monitoreo operativo.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.open(`${apiUrl}/queues/bull-board/`, '_blank')}>
          Abrir colas avanzadas
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-surface-variant" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {queues.map((queue) => (
              <div key={queue.name} className="rounded-xl border border-outline-variant p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-on-surface">{queue.name}</p>
                    <p className="text-sm text-on-surface-variant">Monitoreo básico BullMQ</p>
                  </div>
                  <Badge variant={queue.failed > 0 ? 'error' : 'success'}>
                    {queue.failed > 0 ? 'Con fallos' : 'Ok'}
                  </Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
                  <Stat label="Waiting" value={queue.waiting} />
                  <Stat label="Active" value={queue.active} />
                  <Stat label="Completed" value={queue.completed} />
                  <Stat label="Failed" value={queue.failed} />
                  <Stat label="Delayed" value={queue.delayed} />
                  <Stat label="Paused" value={queue.paused} />
                </div>
              </div>
            ))}
            {queues.length === 0 && <p className="py-8 text-center text-on-surface-variant">No hay colas registradas</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-lg bg-surface-variant px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-on-surface-variant">{label}</p>
      <p className="text-base font-semibold text-on-surface">{value}</p>
    </div>
  );
}
