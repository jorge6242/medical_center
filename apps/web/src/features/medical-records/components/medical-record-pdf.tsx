'use client';

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { MedicalRecordDetail } from '../services/medical-records.service';
import { resolveTemplate } from '../templates/template-resolver';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1e3a5f', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 4,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  card: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 8,
  },
  label: { fontSize: 8, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase' },
  value: { fontSize: 10, color: '#111827' },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af' },
});

export function MedicalRecordPDF({ data }: { data: MedicalRecordDetail }) {
  const template = resolveTemplate(data.templateType, data.templateSnapshot);
  const sections = template?.sections ?? [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Centro Médico</Text>
          <Text style={styles.subtitle}>Informe médico</Text>
          <Text style={styles.subtitle}>Consulta: {data.consultationId}</Text>
          <Text style={styles.subtitle}>Especialidad: {data.specialtyName}</Text>
          <Text style={styles.subtitle}>Plantilla: {data.templateType}</Text>
          <Text style={styles.subtitle}>Estado: {data.status}</Text>
          <Text style={styles.subtitle}>Fecha: {new Date(data.recordedAt).toLocaleDateString('es-VE')}</Text>
        </View>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.grid}>
              {section.fields.map((field) => (
                <View key={field.name} style={styles.card}>
                  <Text style={styles.label}>{field.label}</Text>
                  <Text style={styles.value}>{formatValue(getNestedValue(data.clinicalData, field.name))}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.footer}>Documento generado por Centro Médico. Vista read-only.</Text>
      </Page>
    </Document>
  );
}

function getNestedValue(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current && typeof current === 'object' && !Array.isArray(current) && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, data);
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Sin registrar';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Date(value).toLocaleDateString('es-VE');
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
