import '@testing-library/jest-dom/vitest';

// jsdom has no EventSource. Stub it with an inert implementation so hooks that
// open an SSE stream (useDashboardStream) don't create real connections or
// leak reconnect timers across tests.
class InertEventSource {
  close(): void {}
  addEventListener(): void {}
  removeEventListener(): void {}
}

Object.defineProperty(globalThis, 'EventSource', {
  writable: true,
  value: InertEventSource,
});
