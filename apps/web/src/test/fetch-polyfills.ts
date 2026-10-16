// Jest ejecuta este módulo después de polyfills.ts: undici necesita esos globals.
import { fetch, FormData, Headers, Request, Response } from 'undici';

Object.defineProperties(globalThis, {
  fetch: { value: fetch, writable: true, configurable: true },
  Headers: { value: Headers, writable: true, configurable: true },
  Request: { value: Request, writable: true, configurable: true },
  Response: { value: Response, writable: true, configurable: true },
  FormData: { value: FormData, writable: true, configurable: true },
});
