# Stats Home Extended Specification

## Purpose

Extender los KPIs del dashboard de inicio para incluir métricas de gastos semanales y mensuales, además de los existentes.

## Requirements

### Requirement: Weekly and Monthly Expense Metrics

The system MUST calculate expense totals for current week and month.

#### Scenario: Dashboard shows weekly expenses

- GIVEN admin viewing `/inicio`
- WHEN dashboard loads
- THEN shows new metric cards:
  - Gastos hoy: $450.00
  - Gastos semana: $2,340.00
  - Gastos mes: $8,760.00
- AND expenses are calculated from Expense table where status = ACTIVE

#### Scenario: Dashboard shows monthly net balance

- GIVEN dashboard loads
- WHEN calculating monthly summary
- THEN shows:
  - Ingresos mes: $24,500.00
  - Egresos mes: $8,760.00
  - Neto mes: $15,740.00
- AND ingresos include both consultations and laboratories (Payment.status = COMPLETED)

#### Scenario: No expenses this week

- GIVEN zero expenses in current week
- WHEN dashboard loads
- THEN shows "Gastos semana: $0.00"
- AND does not show warning alert

### Requirement: Recent Activity Feed

The system SHOULD display recent transactions in the dashboard.

#### Scenario: Recent payments feed

- GIVEN dashboard loads
- WHEN fetching recent activity
- THEN shows last 5 payments (consultations + labs):
  - Time, Patient, Type, Amount, Status
- AND sorted by createdAt desc

#### Scenario: Recent expenses feed

- GIVEN dashboard loads
- WHEN fetching recent activity
- THEN shows last 5 expenses:
  - Time, Category, Description, Amount
- AND sorted by createdAt desc

#### Scenario: Empty activity feed

- GIVEN no transactions in last 24h
- WHEN dashboard loads
- THEN shows "Sin actividad reciente"
- AND hides the activity section

### Requirement: Expense Alerts

The system SHOULD alert when expenses exceed thresholds.

#### Scenario: High daily expenses alert

- GIVEN daily expenses > $1,000
- WHEN dashboard loads
- THEN shows warning alert:
  - Title: "Gastos elevados"
  - Message: "$1,450.00 en gastos hoy — revisar detalle"

#### Scenario: Monthly expenses approaching income

- GIVEN month expenses > 80% of month income
- WHEN dashboard loads
- THEN shows critical alert:
  - Title: "Alerta de flujo"
  - Message: "Egresos al 82% de ingresos este mes"

## API Response Extension

```typescript
interface HomeStatsDto {
  patientsToday: number;
  doctorsToday: number;
  canceledDoctorsThisMonth: number;
  pendingPayoutDoctors: number;
  pendingPayoutAmountUsd: string;
  
  // NEW FIELDS
  expensesToday: number;
  expensesThisWeek: number;
  expensesThisMonth: number;
  incomeThisMonth: number;
  netThisMonth: number;
  
  recentActivity: ActivityItem[];
  alerts: HomeStatsAlertDto[];
}

interface ActivityItem {
  id: string;
  type: 'CONSULTATION' | 'LAB' | 'EXPENSE';
  description: string;
  amountUsd: string;
  createdAt: string;
}
```
