'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

import { useCreateExpense, useExpenseCategories } from '../hooks/use-expenses';

const schema = z.object({
  categoryId: z.string().uuid('Selecciona una categoría'),
  description: z.string().min(3, 'Descripción muy corta'),
  amountUsd: z.number().positive('Monto USD requerido'),
  amountBs: z.number().optional(),
});

type FormData = z.infer<typeof schema>;

export function ExpenseForm({ onClose }: { readonly onClose: () => void }) {
  const { data: categories = [] } = useExpenseCategories();
  const { mutate, isPending, error } = useCreateExpense(onClose);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = (data: FormData) => {
    mutate({
      ...data,
      amountBs: data.amountBs ?? undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Select
        {...register('categoryId')}
        id="categoryId"
        label="Categoría"
        error={errors.categoryId?.message}
        options={[
          { value: '', label: 'Seleccionar…' },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />
      <Input
        {...register('description')}
        id="description"
        label="Descripción"
        placeholder="Describe el egreso…"
        error={errors.description?.message}
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          {...register('amountUsd', { valueAsNumber: true })}
          id="amountUsd"
          label="Monto USD"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.amountUsd?.message}
        />
        <Input
          {...register('amountBs', { valueAsNumber: true })}
          id="amountBs"
          label="Monto Bs (opcional)"
          type="number"
          step="0.01"
          placeholder="0.00"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container">
          {error.message}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isPending}>
          Registrar egreso
        </Button>
      </div>
    </form>
  );
}
