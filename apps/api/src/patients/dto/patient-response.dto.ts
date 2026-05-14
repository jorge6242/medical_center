import type { DocumentType, GenderType } from '@prisma/client';

export class PatientResponseDto {
  declare id: string;
  declare documentType: DocumentType;
  declare documentId: string;
  declare name: string;
  declare phone: string | null;
  declare email: string | null;
  declare birthDate: Date | null;
  declare gender: GenderType | null;
  declare isActive: boolean;
  declare createdAt: Date;
}
