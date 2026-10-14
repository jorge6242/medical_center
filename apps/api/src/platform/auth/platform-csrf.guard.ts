import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  PLATFORM_ALLOWED_ORIGINS,
  PLATFORM_JWT_SECRET,
} from './platform-auth.constants';
import { csrfTokenFor, tokensMatch } from './platform-csrf';

import type { PlatformIdentity } from './platform-auth.service';

type PlatformRequest = {
  method: string;
  headers: Record<string, string | undefined>;
  platformAdmin?: PlatformIdentity;
};

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
export const PLATFORM_REQUEST_HEADER = 'x-platform-request';
export const PLATFORM_CSRF_HEADER = 'x-csrf-token';

// Protege todas las mutaciones del realm plataforma. Sin sesión (login) exige
// Origin exacto y un header personalizado, que un formulario cross-site no puede
// enviar sin preflight CORS. Con sesión exige el token ligado a la sesión.
@Injectable()
export class PlatformCsrfGuard implements CanActivate {
  constructor(
    @Inject(PLATFORM_ALLOWED_ORIGINS) private readonly allowedOrigins: string[],
    @Inject(PLATFORM_JWT_SECRET) private readonly secret: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    if (!MUTATING_METHODS.has(request.method)) return true;

    const origin = request.headers['origin'];
    if (!origin || !this.allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Origen no permitido');
    }

    if (!request.platformAdmin) {
      if (request.headers[PLATFORM_REQUEST_HEADER] !== '1') {
        throw new ForbiddenException('Solicitud no válida');
      }
      return true;
    }

    const expected = csrfTokenFor(request.platformAdmin.sessionId, this.secret);
    if (!tokensMatch(request.headers[PLATFORM_CSRF_HEADER], expected)) {
      throw new ForbiddenException('Token CSRF inválido');
    }
    return true;
  }
}
