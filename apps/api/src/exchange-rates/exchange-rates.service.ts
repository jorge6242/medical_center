import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';


import { PrismaService } from '../database/prisma.service';

import type { CreateExchangeRateDto } from './dto/create-exchange-rate.dto';
import type { ExchangeRateResponseDto } from './dto/exchange-rate-response.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class ExchangeRatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateExchangeRateDto): Promise<ExchangeRateResponseDto> {
    const date = new Date(dto.date);
    const existing = await this.prisma.exchangeRate.findFirst({
      where: { tenantId, date },
    });
    if (existing) {
      throw new ConflictException(`Ya existe una tasa BCV para la fecha ${dto.date}`);
    }

    const rate = await this.prisma.exchangeRate.create({
      data: { tenantId, rate: dto.rate, date, source: 'MANUAL' },
    });
    return this.toResponse(rate);
  }

  async findAll(tenantId: string): Promise<ExchangeRateResponseDto[]> {
    const rates = await this.prisma.exchangeRate.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });
    return rates.map((r) => this.toResponse(r));
  }

  async findLatest(tenantId: string): Promise<ExchangeRateResponseDto | null> {
    const rate = await this.prisma.exchangeRate.findFirst({
      where: { tenantId },
      orderBy: { date: 'desc' },
    });
    return rate ? this.toResponse(rate) : null;
  }

  async update(tenantId: string, id: string, dto: CreateExchangeRateDto): Promise<ExchangeRateResponseDto> {
    const existing = await this.prisma.exchangeRate.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException(`Tasa ${id} no encontrada`);

    const updated = await this.prisma.exchangeRate.update({
      where: { id },
      data: { rate: dto.rate, date: new Date(dto.date) },
    });
    return this.toResponse(updated);
  }

  private toResponse(rate: {
    id: string;
    rate: Prisma.Decimal;
    date: Date;
    source: string;
    createdAt: Date;
  }): ExchangeRateResponseDto {
    return {
      id: rate.id,
      rate: rate.rate.toString(),
      date: rate.date.toISOString().split('T')[0] ?? rate.date.toISOString(),
      source: rate.source,
      createdAt: rate.createdAt,
    };
  }
}
