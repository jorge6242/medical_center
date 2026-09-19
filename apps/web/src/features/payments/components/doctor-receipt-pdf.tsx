'use client';

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ReceiptData } from '../services/receipts.service';

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
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 160, color: '#6b7280' },
  value: { flex: 1, color: '#111827' },
  totalRow: {
    flexDirection: 'row',
    marginBottom: 4,
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 4,
  },
  totalLabel: { width: 160, fontFamily: 'Helvetica-Bold', color: '#1e3a5f' },
  totalValue: { flex: 1, fontFamily: 'Helvetica-Bold', color: '#1e3a5f' },
  footer: { marginTop: 40 },
  signatureLine: { borderTopWidth: 1, borderTopColor: '#374151', width: 200, marginTop: 40 },
  signatureLabel: { color: '#6b7280', marginTop: 4 },
  receiptNumber: { fontSize: 9, color: '#9ca3af', marginTop: 4 },
});

function fmt(val: string | number): string {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

function fmtCurrency(val: string | number, currency: string): string {
  const n = parseFloat(String(val));
  if (currency === 'VES') return `${n.toFixed(2)} Bs`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(val: string): string {
  return new Date(val).toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface Props {
  data: ReceiptData;
  tenantName?: string;
}

export function DoctorReceiptPDF({ data, tenantName = 'Centro Médico' }: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{tenantName}</Text>
          <Text style={styles.subtitle}>Recibo de Honorarios Profesionales</Text>
          <Text style={styles.receiptNumber}>N° {data.receiptNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Médico</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{data.doctorName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Documento:</Text>
            <Text style={styles.value}>{data.doctorDocument}</Text>
          </View>
          {data.doctorPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{data.doctorPhone}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Banco:</Text>
            <Text style={styles.value}>{data.bankName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cuenta:</Text>
            <Text style={styles.value}>{data.accountNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle de Consulta</Text>
          {data.services && data.services.length > 0 &&
            data.services.map((service, idx) => (
              <View key={`${service.serviceId}-${idx}`} style={styles.row}>
                <Text style={styles.label}>{service.specialtyName}:</Text>
                <Text style={styles.value}>{service.serviceName} - {fmt(service.priceUsd)}</Text>
              </View>
            ))}
          <View style={styles.row}>
            <Text style={styles.label}>Total consulta:</Text>
            <Text style={styles.value}>{fmt(data.totalConsultation)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Porcentaje médico:</Text>
            <Text style={styles.value}>{data.splitPercentage}%</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Porcentaje centro:</Text>
            <Text style={styles.value}>{(100 - parseFloat(data.splitPercentage)).toFixed(2)}%</Text>
          </View>
        </View>
        {/* Detalle de pago (líneas) */}
        {data.details && data.details.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalle de Pago</Text>
            {data.details.map((d, idx) => (
              <View key={idx} style={{ ...styles.row, marginBottom: 2 }}>
                <Text style={styles.label}>{d.paymentMethod.replace(/_/g, ' ')}:</Text>
                <Text style={styles.value}>
                  {fmtCurrency(d.amount, d.currency)} {d.currency === 'USD' ? '' : ''}
                  {d.referenceNumber ? ` — Ref: ${d.referenceNumber}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totales</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Honorarios médico:</Text>
            <Text style={styles.totalValue}>{fmt(data.doctorShare)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Retención centro:</Text>
            <Text style={styles.value}>{fmt(data.centerShare)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Fecha de emisión:</Text>
          <Text style={styles.value}>{fmtDate(data.generatedAt)}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Firma del médico</Text>
          <View style={{ ...styles.signatureLine, marginTop: 32 }} />
          <Text style={styles.signatureLabel}>Sello del centro médico</Text>
        </View>
      </Page>
    </Document>
  );
}
