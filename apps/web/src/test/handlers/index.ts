import { consultationsHandlers } from './consultations.handlers';
import { lookupsHandlers } from './lookups.handlers';
import { specialtiesHandlers } from './specialties.handlers';
import { statsHandlers } from './stats.handlers';

/**
 * Handlers por defecto (GETs de lectura). Los POST/PATCH/DELETE se definen
 * por test con `server.use(...)`: una mutación inesperada cae en
 * `onUnhandledRequest: 'error'` y el test falla.
 */
export const handlers = [
  ...statsHandlers,
  ...specialtiesHandlers,
  ...lookupsHandlers,
  ...consultationsHandlers,
];
