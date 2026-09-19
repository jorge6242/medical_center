import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import type { ConsolidatedRecord, DetailRecord } from '@/features/reports/services/reports.service';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9 },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 10,
  },
  title: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#1e3a5f', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#666' },
  table: { marginTop: 10 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableCell: { flex: 1, fontSize: 8 },
  tableCellRight: { flex: 1, fontSize: 8, textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    padding: 6,
    backgroundColor: '#f3f4f6',
    marginTop: 4,
  },
  footer: { marginTop: 20, fontSize: 8, color: '#9ca3af' },
});

function formatCurrency(val: string | number): string {
  return `$${parseFloat(String(val)).toFixed(2)}`;
}

interface ConsolidatedReportPDFProps {
  data: ConsolidatedRecord[];
  periodStart: string;
  periodEnd: string;
  tenantName?: string;
}

export function ConsolidatedReportPDF({ data, periodStart, periodEnd, tenantName = 'Centro Médico' }: ConsolidatedReportPDFProps) {
  const totalIncome = data.reduce((sum, r) => sum + Number(r.income.totalUsd), 0);
  const totalExpenses = data.reduce((sum, r) => sum + Number(r.expenses.totalUsd), 0);
  const totalNet = totalIncome - totalExpenses;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{tenantName}</Text>
          <Text style={styles.subtitle}>Reporte Consolidado de Ingresos y Egresos</Text>
          <Text style={styles.subtitle}>Período: {periodStart} al {periodEnd}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableCell}>Período</Text>
            <Text style={styles.tableCellRight}>Consultas</Text>
            <Text style={styles.tableCellRight}>Laboratorios</Text>
            <Text style={styles.tableCellRight}>Ingresos</Text>
            <Text style={styles.tableCellRight}>Egresos</Text>
            <Text style={styles.tableCellRight}>Neto</Text>
          </View>

          {data.map((row) => (
            <View key={row.period} style={styles.tableRow}>
              <Text style={styles.tableCell}>{row.period}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(row.income.consultationsUsd)}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(row.income.laboratoriesUsd)}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(row.income.totalUsd)}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(row.expenses.totalUsd)}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(row.net.usd)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.tableCell, { fontFamily: 'Helvetica-Bold' }]}>TOTALES</Text>
            <Text style={styles.tableCellRight}>-</Text>
            <Text style={styles.tableCellRight}>-</Text>
            <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalIncome)}</Text>
            <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalExpenses)}</Text>
            <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalNet)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Generado el {new Date().toLocaleDateString('es-VE')}</Text>
          <Text>Este reporte es para fines informativos. Para SENIAT, verifique los montos con la contabilidad formal.</Text>
        </View>
      </Page>
    </Document>
  );
}

interface DetailReportPDFProps {
  data: DetailRecord[];
  periodStart: string;
  periodEnd: string;
  tenantName?: string;
}

export function DetailReportPDF({ data, periodStart, periodEnd, tenantName = 'Centro Médico' }: DetailReportPDFProps) {
  const totalAmount = data.reduce((sum, r) => sum + Number(r.amountUsd), 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{tenantName}</Text>
          <Text style={styles.subtitle}>Reporte Detallado de Transacciones</Text>
          <Text style={styles.subtitle}>Período: {periodStart} al {periodEnd}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>Fecha</Text>
            <Text style={styles.tableCell}>Tipo</Text>
            <Text style={[styles.tableCell, { flex: 2 }]}>Descripción</Text>
            <Text style={styles.tableCellRight}>Monto</Text>
          </View>

          {data.map((row) => (
            <View key={row.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1.5 }]}>{new Date(row.date).toLocaleDateString('es-VE')}</Text>
              <Text style={styles.tableCell}>
                {row.recordType === 'CONSULTATION' ? 'Consulta' : row.recordType === 'LAB' ? 'Lab' : 'Egreso'}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>{row.description}</Text>
              <Text style={styles.tableCellRight}>{formatCurrency(row.amountUsd)}</Text>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={[styles.tableCell, { flex: 4.5, fontFamily: 'Helvetica-Bold' }]}>TOTAL</Text>
            <Text style={[styles.tableCellRight, { fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Generado el {new Date().toLocaleDateString('es-VE')}</Text>
          <Text>Total de registros: {data.length}</Text>
        </View>
      </Page>
    </Document>
  );
}
