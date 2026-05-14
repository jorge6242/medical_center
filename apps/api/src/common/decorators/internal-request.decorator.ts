import { SetMetadata } from '@nestjs/common';

export const INTERNAL_REQUEST_KEY = 'internalRequest';
export const InternalRequest = () => SetMetadata(INTERNAL_REQUEST_KEY, true);
