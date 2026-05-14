import { TEMPLATE_REGISTRY, type TemplateName } from './template-registry';

export interface TemplateSummary {
  name: TemplateName;
  version: number;
  category: string;
  audience: string;
}

export function getTemplateCatalog(): TemplateSummary[] {
  return Object.entries(TEMPLATE_REGISTRY).map(([name, template]) => ({
    name: name as TemplateName,
    version: template.version,
    category: template.category,
    audience: template.audience,
  }));
}

export function getTemplateSummary(name: TemplateName): TemplateSummary {
  const template = TEMPLATE_REGISTRY[name];

  return {
    name,
    version: template.version,
    category: template.category,
    audience: template.audience,
  };
}
