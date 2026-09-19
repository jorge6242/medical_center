'use client';

import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod/v4';

import { Button } from '@/shared/components/ui/button';
import { Card } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';

import { useSaveMedicalRecord } from '../hooks/use-medical-records';
import { getTemplate } from '../templates/template-registry';
import type { MedicalRecordField } from '../schemas/types';

type FormValue = Record<string, unknown>;

interface SchemaNode {
  required: boolean;
  children: Record<string, SchemaNode>;
  schema?: z.ZodTypeAny;
}

function createNode(): SchemaNode {
  return { required: false, children: {} };
}

function insertField(root: SchemaNode, field: MedicalRecordField) {
  const parts = field.name.split('.');
  const leafSchema = field.type === 'number' ? z.number() : z.string();

  let current = root;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index]!;
    current.children[part] ??= createNode();
    current = current.children[part]!;

    if (index === parts.length - 1) {
      current.schema = field.required ? leafSchema : leafSchema.optional();
      current.required = Boolean(field.required);
    }
  }
}

function markRequiredFlags(node: SchemaNode): boolean {
  if (node.schema) {
    return node.required;
  }

  node.required = Object.values(node.children).some((child) => markRequiredFlags(child));
  return node.required;
}

function toZod(node: SchemaNode, isRoot = false): z.ZodTypeAny {
  if (node.schema) {
    return node.schema;
  }

  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, child] of Object.entries(node.children)) {
    shape[key] = toZod(child);
  }

  const objectSchema = z.object(shape);
  if (isRoot || node.required) {
    return objectSchema;
  }

  return objectSchema.optional();
}

function buildSchema(templateType: string): z.ZodType<FormValue> {
  const template = getTemplate(templateType);
  if (!template) {
    throw new Error(`Template no encontrado: ${templateType}`);
  }

  const root = createNode();

  for (const section of template.sections) {
    for (const field of section.fields) {
      insertField(root, field);
    }
  }

  markRequiredFlags(root);
  return toZod(root, true) as z.ZodType<FormValue>;
}

function FieldInput({ field, register }: { field: MedicalRecordField; register: ReturnType<typeof useForm<FormValue>>['register'] }) {
  if (field.type === 'textarea') {
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={field.name} className="text-sm font-medium text-on-surface">
          {field.label}
        </label>
        <textarea
          id={field.name}
          {...register(field.name)}
          className="min-h-24 rounded-lg border border-outline bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    );
  }

  if (field.type === 'number') {
    return <Input {...register(field.name, { valueAsNumber: true })} id={field.name} label={field.label} type="number" />;
  }

  if (field.type === 'date') {
    return <Input {...register(field.name)} id={field.name} label={field.label} type="date" />;
  }

  return <Input {...register(field.name)} id={field.name} label={field.label} />;
}

export function MedicalRecordDynamicForm({
  patientId,
  consultationId,
  templateType,
  onSuccess,
}: {
  patientId: string;
  consultationId: string;
  templateType: string;
  onSuccess?: () => void;
}) {
  const schema = useMemo(() => buildSchema(templateType), [templateType]);
  const saveMedicalRecord = useSaveMedicalRecord(patientId, onSuccess);

  const methods = useForm<FormValue>({
    resolver: zodResolver(schema as never) as Resolver<FormValue>,
    defaultValues: {},
  });

  const template = getTemplate(templateType);

  const onSubmit = (values: FormValue) => {
    saveMedicalRecord.mutate({
      patientId,
      consultationId,
      templateType,
      templateVersion: template?.version,
      templateSnapshot: template
        ? { type: template.type, version: template.version, label: template.label, sections: template.sections }
        : undefined,
      clinicalData: values,
    });
  };

  return (
    <Card className="p-4">
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {template?.sections.map((section) => (
          <div key={section.title} className="flex flex-col gap-3">
            <h3 className="text-base font-semibold text-on-surface">{section.title}</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {section.fields.map((field) => (
                <FieldInput key={field.name} field={field} register={methods.register} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button type="submit" isLoading={saveMedicalRecord.isPending}>
            Guardar informe
          </Button>
        </div>
      </form>
    </Card>
  );
}
