import { SetMetadata } from '@nestjs/common';

import { PLATFORM_REALM_KEY } from './platform-auth.constants';

// Marca una ruta del realm de plataforma. El JwtAuthGuard global delega en
// PlatformAuthGuard y nunca en la estrategia tenant. Sin este decorador la ruta
// conserva el realm tenant.
export const PlatformRealm = () => SetMetadata(PLATFORM_REALM_KEY, true);
