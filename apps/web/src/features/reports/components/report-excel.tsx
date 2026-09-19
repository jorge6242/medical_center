import * as XLSX from 'xlsx';

import type { ConsolidatedRecord, DetailRecord } from '@/features/reports/services/reports.service';

export function generateConsolidatedExcel(
  data: ConsolidatedRecord[],
  periodStart: string,
  periodEnd: string,
): Blob {
  const rows = data.map((row) => ({
    Período: row.period,
    'Fecha Inicio': row.periodStart,
    'Fecha Fin': row.periodEnd,
    Consultas: Number(row.income.consultationsUsd),
    Laboratorios: Number(row.income.laboratoriesUsd),
    'Total Ingresos': Number(row.income.totalUsd),
    'Total Egresos': Number(row.expenses.totalUsd),
    IGTF: Number(row.income.igtfUsd),
    Neto: Number(row.net.usd),
    'Trans. Ingresos': row.income.transactionCount,
    'Trans. Egresos': row.expenses.transactionCount,
  }));

  // Add totals row
  const totalIncome = data.reduce((sum, r) => sum + Number(r.income.totalUsd), 0);
  const totalExpenses = data.reduce((sum, r) => sum + Number(r.expenses.totalUsd), 0);
  const totalNet = totalIncome - totalExpenses;

  rows.push({
    Período: 'TOTALES',
    'Fecha Inicio': '',
    'Fecha Fin': '',
    Consultas: data.reduce((sum, r) => sum + Number(r.income.consultationsUsd), 0),
    Laboratorios: data.reduce((sum, r) => sum + Number(r.income.laboratoriesUsd), 0),
    'Total Ingresos': totalIncome,
    'Total Egresos': totalExpenses,
    IGTF: data.reduce((sum, r) => sum + Number(r.income.igtfUsd), 0),
    Neto: totalNet,
    'Trans. Ingresos': data.reduce((sum, r) => sum + r.income.transactionCount, 0),
    'Trans. Egresos': data.reduce((sum, r) => sum + r.expenses.transactionCount, 0),
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  const wscols = [
    { wch: 15 }, // Período
    { wch: 15 }, // Fecha Inicio
    { wch: 15 }, // Fecha Fin
    { wch: 12 }, // Consultas
    { wch: 12 }, // Laboratorios
    { wch: 14 }, // Total Ingresos
    { wch: 14 }, // Total Egresos
    { wch: 10 }, // IGTF
    { wch: 12 }, // Neto
    { wch: 18 }, // Trans. Ingresos
    { wch: 18 }, // Trans. Egresos
  ];
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Consolidado');

  // Add metadata
  const metaRows = [
    ['Centro Médico - Reporte Consolidado'],
    [`Período: ${periodStart} al ${periodEnd}`],
    [`Generado: ${new Date().toLocaleDateString('es-VE')}`],
    [],
  ];
  
  // We can't easily prepend to xlsx sheets, so we'll just keep it simple
  // The metadata could be added as a separate sheet if needed

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function generateDetailExcel(
  data: DetailRecord[],
  periodStart: string,
  periodEnd: string,
): Blob {
  const rows = data.map((row) => ({
    Fecha: new Date(row.date).toLocaleDateString('es-VE'),
    Hora: new Date(row.date).toLocaleTimeString('es-VE'),
    Tipo: row.recordType === 'CONSULTATION' ? 'Consulta' : row.recordType === 'LAB' ? 'Laboratorio' : 'Egreso',
    Paciente: row.patientName || '',
    Doctor: row.doctorName || '',
    Descripción: row.description,
    Categoría: row.categoryName || '',
    'Monto USD': Number(row.amountUsd),
    'Monto Bs': Number(row.amountBs || 0),
    Estado: row.status,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  const wscols = [
    { wch: 12 }, // Fecha
    { wch: 10 }, // Hora
    { wch: 12 }, // Tipo
    { wch: 20 }, // Paciente
    { wch: 20 }, // Doctor
    { wch: 30 }, // Descripción
    { wch: 15 }, // Categoría
    { wch: 12 }, // Monto USD
    { wch: 12 }, // Monto Bs
    { wch: 10 }, // Estado
  ];
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Detalle');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
