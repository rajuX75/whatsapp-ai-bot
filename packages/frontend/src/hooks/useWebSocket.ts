import { useEffect, useRef, useState } from 'react';

export function useWebSocket<T = unknown>(path: string): {
  lastMessage: T | null;
  connected: boolean;
} {
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}${path}`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        setLastMessage(JSON.parse(ev.data) as T);
      } catch {
        // ignore non-JSON frames
      }
    };
    return () => {
      ws.close();
    };
  }, [path]);

  return { lastMessage, connected };
}
