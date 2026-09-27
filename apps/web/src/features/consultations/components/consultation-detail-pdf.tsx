import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ConsultationDetail } from '../services/consultations.service';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: {
    borderBottomColor: '#1e3a5f',
    borderBottomWidth: 2,
    marginBottom: 20,
    paddingBottom: 12,
  },
  title: {
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  subtitle: { color: '#666', fontSize: 10 },
  section: { marginBottom: 16 },
  sectionTitle: {
    color: '#1e3a5f',
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    marginBottom: 6,
  },
  row: {
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 6,
  },
  label: { color: '#6b7280', width: '34%' },
  value: { width: '66%' },
  total: { fontFamily: 'Helvetica-Bold', fontSize: 12, textAlign: 'right' },
  footer: { color: '#9ca3af', fontSize: 8, marginTop: 20 },
});

function formatUsd(value: string): string {
  return `$${Number(value).toFixed(2)}`;
}

export function ConsultationDetailPDF({ consultation }: { consultation: ConsultationDetail }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Detalle de consulta</Text>
          <Text style={styles.subtitle}>
            Fecha: {new Date(consultation.date).toLocaleString('es-VE')}
          </Text>
          <Text style={styles.subtitle}>Estado: {consultation.status}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paciente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{consultation.patientName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula</Text>
            <Text style={styles.value}>{consultation.patientDocument}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Edad</Text>
            <Text style={styles.value}>
              {consultation.patientAge === null
                ? 'No registrada'
                : `${consultation.patientAge} años`}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profesional</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre</Text>
            <Text style={styles.value}>{consultation.doctorName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cédula</Text>
            <Text style={styles.value}>{consultation.doctorDocument}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicios</Text>
          {consultation.services.map((service, index) => (
            <View key={`${service.serviceName}-${index}`} style={styles.row}>
              <Text style={styles.label}>{service.specialtyName}</Text>
              <Text style={styles.value}>
                {service.serviceName} · {formatUsd(service.priceUsd)}
              </Text>
            </View>
          ))}
          <Text style={styles.total}>Total servicios: {formatUsd(consultation.totalUsd)}</Text>
        </View>

        {consultation.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text>{consultation.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Documento generado por Centro Médico. No incluye porcentajes ni distribuciones de pago.
        </Text>
      </Page>
    </Document>
  );
}
