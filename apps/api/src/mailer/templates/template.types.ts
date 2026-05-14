export interface TemplateDefinition<TContext extends object> {
  name: string;
  version: number;
  category: 'receipt' | 'auth' | 'system' | 'notification';
  audience: 'doctor' | 'patient' | 'admin' | 'system';
  subject: string;
  render: (context: TContext) => string;
}
