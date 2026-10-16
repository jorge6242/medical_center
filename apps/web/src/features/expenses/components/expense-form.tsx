'use client';

import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v4';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';

import { useCreateExpense, useExpenseCategories } from '../hooks/use-expenses';

const schema = z.object({
  categoryId: z.string().uuid('Selecciona una categoría'),
  description: z.string().min(2, 'Descripción muy corta').max(200, 'Descripción demasiado larga'),
  amountUsd: z
    .number()
    .positive('Monto USD requerido')
    .multipleOf(0.01, 'Usa como máximo 2 decimales'),
  amountBs: z
    .number()
    .positive('Monto Bs debe ser positivo')
    .multipleOf(0.01, 'Usa como máximo 2 decimales')
    .optional(),
});

type FormData = z.infer<typeof schema>;

export function ExpenseForm({
  onClose,
  onPendingChange,
}: {
  readonly onClose: () => void;
  readonly onPendingChange?: (pending: boolean) => void;
}) {
  const { data: categories = [], isFetching, error: categoriesError } = useExpenseCategories();
  const { mutate, isPending, error } = useCreateExpense(onClose);
  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: '', description: '' },
  });

  const onSubmit = (data: FormData) => {
    if (isPending || isFetching || categoriesError || categories.length === 0) return;
    mutate({
      ...data,
      amountBs: data.amountBs ?? undefined,
    });
  };

  if (!isPending && categoriesError) return <p role="alert">{categoriesError.message}</p>;
  if (!isPending && isFetching) return <p role="status">Cargando categorías...</p>;
  if (!isPending && categories.length === 0) return <p>No hay categorías disponibles</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <fieldset disabled={isPending} className="contents">
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
            {...register('amountBs', {
              setValueAs: (value: string) => (value === '' ? undefined : Number(value)),
            })}
            id="amountBs"
            label="Monto Bs (opcional)"
            error={errors.amountBs?.message}
            type="number"
            step="0.01"
            placeholder="0.00"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-error-container px-3 py-2 text-sm text-on-error-container"
          >
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
      </fieldset>
    </form>
  );
}
