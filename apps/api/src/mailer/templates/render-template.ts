export function renderTemplateString<TContext extends object>(
  template: string,
  context: TContext,
): string {
  const values = context as Record<string, unknown>;

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = values[key];
    return value == null ? '' : String(value);
  });
}
