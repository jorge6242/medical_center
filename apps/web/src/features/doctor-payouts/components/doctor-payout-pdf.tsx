'use client';

import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { DoctorPayoutDetail } from '../services/doctor-payouts.service';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 10,
  },
  title: { color: '#1e3a5f', fontFamily: 'Helvetica-Bold', fontSize: 18, marginBottom: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { color: '#1e3a5f', fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 7 },
  line: { marginBottom: 4 },
  tableHeader: {
    backgroundColor: '#e5e7eb',
    flexDirection: 'row',
    fontFamily: 'Helvetica-Bold',
    padding: 6,
  },
  row: { borderBottomWidth: 1, borderBottomColor: '#e5e7eb', flexDirection: 'row', padding: 6 },
  date: { width: '18%' },
  patient: { width: '30%' },
  service: { width: '52%' },
  summary: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 10,
    width: '55%',
  },
  footer: { color: '#6b7280', fontSize: 8, marginTop: 20 },
});

function usd(value: string) {
  return `USD ${Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function bs(value: string) {
  return `Bs. ${Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function bcvRate(value: string) {
  return Number(value).toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface DoctorPayoutPDFProps {
  payout: DoctorPayoutDetail;
  tenantName?: string;
  isPreview?: boolean;
}

export function DoctorPayoutPDF({
  payout,
  tenantName = 'Centro Médico',
  isPreview = false,
}: DoctorPayoutPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{isPreview ? `BORRADOR — ${tenantName}` : tenantName}</Text>
          <Text>
            {isPreview
              ? 'Vista previa de pago de honorarios — no válida como comprobante'
              : 'Comprobante de pago de honorarios médicos'}
          </Text>
          <Text>Fecha: {new Date(payout.createdAt).toLocaleDateString('es-VE')}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profesional</Text>
          <Text style={styles.line}>{payout.doctorName}</Text>
          <Text style={styles.line}>Cédula: {payout.doctorDocument}</Text>
          <Text style={styles.line}>Método: {payout.paymentMethod.replaceAll('_', ' ')}</Text>
          {payout.referenceNumber ? (
            <Text style={styles.line}>Referencia: {payout.referenceNumber}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultas incluidas</Text>
          <View style={styles.tableHeader}>
            <Text style={styles.date}>Fecha</Text>
            <Text style={styles.patient}>Paciente</Text>
            <Text style={styles.service}>Servicios</Text>
          </View>
          {payout.items.map((item) => (
            <View key={item.paymentId} style={styles.row}>
              <Text style={styles.date}>
                {item.consultationDate
                  ? new Date(item.consultationDate).toLocaleDateString('es-VE')
                  : 'Sin fecha'}
              </Text>
              <Text style={styles.patient}>
                {item.patientName}
                {item.patientDocument ? `\n${item.patientDocument}` : ''}
              </Text>
              <Text style={styles.service}>
                {item.services
                  .map((service) => `${service.serviceName} · ${service.specialtyName}`)
                  .join('\n') || item.description}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.summary}>
          <Text style={styles.line}>Total a pagar: {usd(payout.amountUsd)}</Text>
          <Text style={styles.line}>
            Tasa BCV: {payout.bcvExchangeRate ? bcvRate(payout.bcvExchangeRate) : 'No registrada'}{' '}
            Bs/USD
          </Text>
          <Text>
            Equivalente BCV: {payout.equivalentBs ? bs(payout.equivalentBs) : 'No disponible'}
          </Text>
        </View>
        <Text style={styles.footer}>
          {isPreview
            ? 'BORRADOR — este documento es una vista previa y no registra ni confirma ningún pago.'
            : `Documento generado por ${tenantName}.`}
        </Text>
      </Page>
    </Document>
  );
}
