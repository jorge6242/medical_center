import { Button } from '@/shared/components/ui/button';

interface FormActionsProps {
  readonly onCancel: () => void;
  readonly isPending: boolean;
  readonly submitLabel: string;
}

export function FormActions({ onCancel, isPending, submitLabel }: FormActionsProps) {
  return (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" isLoading={isPending}>
        {submitLabel}
      </Button>
    </div>
  );
}
