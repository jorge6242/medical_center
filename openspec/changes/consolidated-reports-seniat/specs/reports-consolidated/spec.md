# Reports Consolidated Specification

## Purpose

API y lógica de negocio para reportes consolidados de ingresos (consultas + laboratorios) y egresos, agrupados por período.

## Requirements

### Requirement: Report Query with Date Range

The system MUST accept date range filters and return aggregated financial data.

#### Scenario: Admin requests consolidated report by day

- GIVEN admin with `reports:read` permission
- WHEN `GET /reports/consolidated?from=2026-05-01&to=2026-05-31&groupBy=day`
- THEN returns array of daily records with:
  - date, totalIncomeUsd, totalIncomeBs, totalExpensesUsd, totalExpensesBs, netUsd, transactionCount
- AND income splits by type: consultationsUsd, laboratoriesUsd

#### Scenario: Admin requests consolidated report by week

- GIVEN same admin
- WHEN `GET /reports/consolidated?from=2026-05-01&to=2026-05-31&groupBy=week`
- THEN returns array grouped by ISO week (week number + year)

#### Scenario: Admin requests consolidated report by month

- GIVEN same admin
- WHEN `GET /reports/consolidated?from=2026-01-01&to=2026-12-31&groupBy=month`
- THEN returns array grouped by month (YYYY-MM)

#### Scenario: Missing date parameters

- GIVEN admin without from/to params
- WHEN `GET /reports/consolidated`
- THEN returns 400 Bad Request with message "from and to are required"

### Requirement: Detail Report Filtering

The system MUST support filtering detailed transactions by type.

#### Scenario: Filter by consultations only

- GIVEN admin with reports access
- WHEN `GET /reports/detail?from=2026-05-01&to=2026-05-31&type=consultation`
- THEN returns only Payment records where `itemType = CONSULTATION`
- AND includes patientName, doctorName, services snapshot, totalServiceUsd, paymentMethods

#### Scenario: Filter by laboratories only

- GIVEN admin with reports access
- WHEN `GET /reports/detail?from=2026-05-01&to=2026-05-31&type=lab`
- THEN returns only Payment records where `itemType = LAB`
- AND includes patientName, tests snapshot, totalServiceUsd

#### Scenario: Filter by expenses only

- GIVEN admin with reports access
- WHEN `GET /reports/detail?from=2026-05-01&to=2026-05-31&type=expense`
- THEN returns Expense records with categoryName, description, amountUsd, amountBs

#### Scenario: All types combined

- GIVEN admin with reports access
- WHEN `GET /reports/detail?from=2026-05-01&to=2026-05-31`
- THEN returns unified list sorted by date descending
- AND each row has `recordType` field: CONSULTATION | LAB | EXPENSE

### Requirement: Income Aggregation Rules

The system MUST calculate income based on Payment.createdAt and use totalServiceUsd.

#### Scenario: Consultation payment with IGTF

- GIVEN a completed consultation payment of $100 with $3 IGTF
- WHEN report queries the date
- THEN totalIncomeUsd MUST be $100 (service value, not including IGTF)
- AND totalIgtfUsd MUST be reported separately

#### Scenario: Lab payment with zero doctor share

- GIVEN a completed lab payment of $50
- WHEN report queries the date
- THEN totalIncomeUsd MUST be $50
- AND doctorShareUsd MUST be $0
- AND centerShareUsd MUST be $50

### Requirement: Expense Aggregation Rules

The system MUST calculate expenses based on Expense.createdAt and status = ACTIVE.

#### Scenario: Voided expenses excluded

- GIVEN an expense of $200 voided yesterday
- WHEN report queries the date range including yesterday
- THEN the voided expense MUST NOT appear in totals
- AND MUST appear in detail view if `includeVoided=true` param provided

## Data Model (API Response)

### ConsolidatedRecord

```typescript
interface ConsolidatedRecord {
  period: string; // "2026-05-15" | "2026-W20" | "2026-05"
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  
  income: {
    consultationsUsd: string;
    laboratoriesUsd: string;
    totalUsd: string;
    totalBs: string;
    igtfUsd: string;
    transactionCount: number;
  };
  
  expenses: {
    totalUsd: string;
    totalBs: string;
    transactionCount: number;
  };
  
  net: {
    usd: string;
    bs: string;
  };
}
```

### DetailRecord

```typescript
interface DetailRecord {
  id: string;
  recordType: 'CONSULTATION' | 'LAB' | 'EXPENSE';
  date: string; // createdAt
  patientName?: string;
  doctorName?: string;
  description: string; // services/tests snapshot or expense description
  categoryName?: string; // for expenses
  amountUsd: string;
  amountBs?: string;
  paymentMethods?: string[]; // for payments
  status: string;
}
```
