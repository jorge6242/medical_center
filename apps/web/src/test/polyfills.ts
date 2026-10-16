/**
 * Polyfills de globals Node que jsdom no implementa.
 * Deben cargarse en `setupFiles` (antes del framework y de MSW):
 * MSW parchea `globalThis.fetch` al hacer `server.listen()`, por lo que
 * el fetch de undici tiene que existir antes.
 */
import { Blob, File } from 'node:buffer';
import { webcrypto } from 'node:crypto';
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web';
import { TextDecoder, TextEncoder } from 'node:util';
import { BroadcastChannel, MessagePort } from 'node:worker_threads';

class UnrefBroadcastChannel extends BroadcastChannel {
  constructor(name: string) {
    super(name);
    this.unref();
  }
}

Object.defineProperties(globalThis, {
  BroadcastChannel: { value: UnrefBroadcastChannel, writable: true },
  MessagePort: { value: MessagePort, writable: true },
  TextDecoder: { value: TextDecoder, writable: true },
  TextEncoder: { value: TextEncoder, writable: true },
  ReadableStream: { value: ReadableStream, writable: true },
  WritableStream: { value: WritableStream, writable: true },
  TransformStream: { value: TransformStream, writable: true },
  Blob: { value: Blob, writable: true },
  File: { value: File, writable: true },
  // jsdom expone crypto sin randomUUID; el de Node es completo
  crypto: { value: webcrypto, writable: true },
});
