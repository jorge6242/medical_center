import { DocumentType } from '@prisma/client';
import { IsEnum, IsString, Length } from 'class-validator';

export class VerifyDocumentDto {
  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @Length(6, 12)
  declare documentId: string;
}
