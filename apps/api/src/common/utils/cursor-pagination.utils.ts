import { BadRequestException } from '@nestjs/common';

export interface NameCursor {
  name: string;
  id: string;
}

export function encodeNameCursor(cursor: NameCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeNameCursor(value: string | undefined): NameCursor | undefined {
  if (!value) return undefined;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (isNameCursor(parsed)) return parsed;
  } catch {
    throw new BadRequestException('Cursor de búsqueda inválido');
  }

  throw new BadRequestException('Cursor de búsqueda inválido');
}

function isNameCursor(value: unknown): value is NameCursor {
  if (!value || typeof value !== 'object') return false;
  const cursor = value as Record<string, unknown>;
  return typeof cursor.name === 'string' && typeof cursor.id === 'string';
}
