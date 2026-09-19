import type { MedicalRecordTemplate } from './types';
import { getTemplate } from './template-registry';

/**
 * Resolves the template for a medical record.
 * Priority:
 * 1. templateSnapshot from the record (immutable, stored at creation time)
 * 2. Current registry template (fallback for records created before snapshot support)
 */
export function resolveTemplate(
  templateType: string,
  templateSnapshot: Record<string, unknown> | null | undefined,
): MedicalRecordTemplate | undefined {
  if (templateSnapshot && typeof templateSnapshot === 'object') {
    // Validate that the snapshot has the minimum required structure
    const snapshot = templateSnapshot as Partial<MedicalRecordTemplate>;
    if (Array.isArray(snapshot.sections)) {
      return {
        type: snapshot.type ?? templateType,
        version: snapshot.version ?? 'unknown',
        label: snapshot.label ?? templateType,
        sections: snapshot.sections,
      };
    }
  }

  // Fallback to current registry
  return getTemplate(templateType);
}
