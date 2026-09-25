export interface RequestContext {
  userId?: string;
  tenantId?: string;
  email?: string;
  role?: string;
  correlationId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
}

export const REQUEST_CONTEXT = 'REQUEST_CONTEXT';
