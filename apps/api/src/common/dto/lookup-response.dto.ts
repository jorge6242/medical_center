export class EntityLookupItemDto {
  declare id: string;
  declare name: string;
  declare documentType: string;
  declare documentId: string;
}

export class LookupResponseDto {
  declare data: EntityLookupItemDto[];
  declare nextCursor: string | null;
  declare hasNextPage: boolean;
}
