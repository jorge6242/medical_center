export class ServicePriceResponseDto {
  declare id: string;
  declare serviceId: string;
  declare serviceName: string;
  declare priceUsd: string;
  declare isActive: boolean;
}

export class SpecialtyResponseDto {
  declare id: string;
  declare name: string;
  declare isActive: boolean;
  declare services: ServicePriceResponseDto[];
}
