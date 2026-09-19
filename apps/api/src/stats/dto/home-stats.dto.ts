export class HomeStatsAlertDto {
  declare severity: 'info' | 'warning' | 'error';
  declare title: string;
  declare message: string;
}

export class HomeStatsDto {
  declare patientsToday: number;
  declare doctorsToday: number;
  declare canceledDoctorsThisMonth: number;
  declare pendingPayoutDoctors: number;
  declare pendingPayoutAmountUsd: string;
  declare expensesToday: number;
  declare expensesThisWeek: number;
  declare expensesThisMonth: number;
  declare incomeThisMonth: number;
  declare netThisMonth: number;
  declare alerts: HomeStatsAlertDto[];
}
