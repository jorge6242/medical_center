import { z } from 'zod/v4';

export const ALL_DOCUMENT_TYPES = ['V', 'E', 'J', 'G', 'M', 'P'] as const;
export type DocumentType = (typeof ALL_DOCUMENT_TYPES)[number];

export const representativeSchema = z.object({
  documentType: z.enum(['V', 'E', 'P']),
  documentId: z.string().min(6, 'Mínimo 6 caracteres'),
  name: z.string().min(2, 'Nombre requerido'),
  phone: z.string().optional(),
  relationship: z.string().min(1, 'Parentesco requerido'),
});

export const patientFormSchema = z
  .object({
    name: z.string().min(2, 'Nombre requerido'),
    documentType: z.enum(ALL_DOCUMENT_TYPES),
    documentId: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    birthDate: z.string().optional().or(z.literal('')),
    gender: z.enum(['MASCULINE', 'FEMININE', 'OTHER']).optional(),
    representative: representativeSchema.optional(),
  })
  .refine((data) => data.documentType === 'M' || (data.documentId?.trim().length ?? 0) >= 6, {
    message: 'Número de documento requerido (mínimo 6 caracteres)',
    path: ['documentId'],
  });

export type PatientFormData = z.infer<typeof patientFormSchema>;
export type RepDocType = z.infer<typeof representativeSchema>['documentType'];
