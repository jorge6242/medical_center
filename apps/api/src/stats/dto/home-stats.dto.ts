export class HomeStatsAlertDto {
  declare severity: 'info' | 'warning';
  declare title: string;
  declare message: string;
}

export class HomeStatsDto {
  declare patientsToday: number;
  declare doctorsToday: number;
  declare canceledDoctorsThisMonth: number;
  declare pendingPayoutDoctors: number;
  declare pendingPayoutAmountUsd: string;
  declare alerts: HomeStatsAlertDto[];
}
