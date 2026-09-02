'use client';

import { useEffect, useRef, useState } from 'react';
import { parseDashboardEvent } from '@/lib/dashboard-events';
import type { DashboardEvent } from '@/types/events';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

export type StreamStatus = 'connecting' | 'open' | 'closed';

export interface UseDashboardStreamResult {
  status: StreamStatus;
  lastEvent: DashboardEvent | null;
  events: DashboardEvent[];
}

/**
 * Subscribes to the dashboard SSE stream for a project. Handles reconnection
 * with exponential backoff and keeps the most recent events in state.
 *
 * Passing `null` as projectId disables the subscription.
 */
export function useDashboardStream(projectId: string | null): UseDashboardStreamResult {
  const [status, setStatus] = useState<StreamStatus>('closed');
  const [lastEvent, setLastEvent] = useState<DashboardEvent | null>(null);
  const [events, setEvents] = useState<DashboardEvent[]>([]);

  const attemptRef = useRef(0);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!projectId) {
      setStatus('closed');
      return;
    }

    let disposed = false;

    const connect = (): void => {
      if (disposed) {
        return;
      }
      setStatus('connecting');
      const url = `${API_BASE_URL}/api/events/stream?projectId=${encodeURIComponent(projectId)}`;
      const source = new EventSource(url, { withCredentials: true });
      sourceRef.current = source;

      source.addEventListener('open', () => {
        attemptRef.current = 0;
        setStatus('open');
      });

      source.addEventListener('trace.ingested', (message: MessageEvent<string>) => {
        const event = parseDashboardEvent(message.data);
        if (event) {
          setLastEvent(event);
          setEvents((prev) => [event, ...prev].slice(0, 100));
        }
      });

      source.addEventListener('error', () => {
        // The browser closes the source on fatal errors; reconnect with backoff.
        source.close();
        sourceRef.current = null;
        setStatus('connecting');
        const delay = Math.min(BASE_BACKOFF_MS * 2 ** attemptRef.current, MAX_BACKOFF_MS);
        attemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      });
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      sourceRef.current?.close();
      sourceRef.current = null;
      setStatus('closed');
    };
  }, [projectId]);

  return { status, lastEvent, events };
}
