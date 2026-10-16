import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

import { useAuthStore } from '@/stores/auth.store';

import { clearTestClients } from './render';
import { server } from './server';

// LookupCombobox observa scroll infinito; jsdom no implementa IntersectionObserver
Object.defineProperty(globalThis, 'IntersectionObserver', {
  writable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

beforeAll(() => {
  // Toda petición sin handler explícito falla: la red queda acotada por contrato
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(async () => {
  cleanup();
  await clearTestClients();
  useAuthStore.setState(useAuthStore.getInitialState(), true);
  server.resetHandlers();
  jest.restoreAllMocks();
  jest.clearAllMocks();
  jest.useRealTimers();
});

afterAll(() => {
  server.close();
});
