export class AuthResponseDto {
  declare userId: string;
  declare email: string;
  declare role: string;
  declare roleVersion: number;
  declare doctorId: string | null;
  declare permissions: Array<{ resource: string; action: string }>;
}
