import { DocumentType } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class VerifyDocumentDto {
  @IsEnum(DocumentType)
  declare documentType: DocumentType;

  @IsString()
  @MinLength(6)
  declare documentId: string;
}
