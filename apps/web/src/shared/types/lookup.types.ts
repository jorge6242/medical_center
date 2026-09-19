export interface LookupItem {
  id: string;
  name: string;
  documentType: string;
  documentId: string;
}

export interface LookupResponse<T extends LookupItem = LookupItem> {
  data: T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}
