export class PermissionResponseDto {
  declare resource: string;
  declare action: string;
}

export class RoleResponseDto {
  declare id: string;
  declare name: string;
  declare permissions: PermissionResponseDto[];
}
