export class AuthResponseDto {
  declare role: string;
  declare roleVersion: number;
  declare permissions: Array<{ resource: string; action: string }>;
}
