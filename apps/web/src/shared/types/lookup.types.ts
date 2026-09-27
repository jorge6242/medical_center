export interface LookupItem {
  id: string;
  name: string;
  documentType: string;
  documentId: string;
  age?: number;
}

export interface LookupResponse<T extends LookupItem = LookupItem> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}
