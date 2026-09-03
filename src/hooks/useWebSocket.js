import { useEffect, useRef, useState, useCallback } from 'react';

// Single Base Backend WebSocket URL used across the entire team
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://shastra-sync.onrender.com/ws/alerts';
const ELDER_ID = import.meta.env.VITE_ELDER_ID || 'elder_kamala_001';

const INITIAL_RETRY_MS = 1500;
const MAX_RETRY_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 25000;

/**
 * Bulletproof Single-URL WebSocket Client.
 * Connects directly and exclusively to the team's shared base backend URL.
 * Automatically keeps alive and reconnects without jumping to unintended local addresses.
 */
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);
  const retryDelayRef = useRef(INITIAL_RETRY_MS);
  const retryTimerRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const intentionalCloseRef = useRef(false);

  const startHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(
            JSON.stringify({
              type: 'ping',
              client_type: 'elder_tablet',
              elder_id: ELDER_ID,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (e) {
          // Silent catch on heartbeat error
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    if (wsRef.current) {
      intentionalCloseRef.current = true;
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }

    try {
      console.log(`🔌 Connecting to Team Base WebSocket: ${WS_URL}`);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      intentionalCloseRef.current = false;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        console.log('✓ Successfully connected to Team Base WebSocket:', WS_URL);
        setIsConnected(true);
        setConnectionState('connected');
        retryDelayRef.current = INITIAL_RETRY_MS;

        // Register client presence so Hub and Family Dashboard know this tablet is live
        try {
          ws.send(
            JSON.stringify({
              type: 'client_registered',
              client_type: 'elder_tablet',
              elder_id: ELDER_ID,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (e) {
          console.warn('Failed to dispatch registration frame:', e);
        }

        // Start ping heartbeat to prevent Cloudflare/Render idle timeouts
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          let data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) {}
          }
          // Ignore heartbeat pong/ping responses from server
          if (data && (data.type === 'pong' || data.type === 'ping')) return;

          console.log('🚨 Incoming Team WebSocket Payload:', data);
          setLastMessage(data);
        } catch (parseErr) {
          console.log('🚨 Incoming Plain Text WebSocket Message:', event.data);
          if (event.data && typeof event.data === 'string' && event.data.trim()) {
            setLastMessage({
              type: 'raw_text',
              text: event.data.trim(),
              message: event.data.trim(),
              timestamp: new Date().toISOString(),
            });
          }
        }
      };

      ws.onerror = (err) => {
        console.warn(`WebSocket notice on ${WS_URL}:`, err);
      };

      ws.onclose = () => {
        stopHeartbeat();
        if (!mountedRef.current) return;
        wsRef.current = null;
        setIsConnected(false);

        if (intentionalCloseRef.current) {
          setConnectionState('disconnected');
          return;
        }

        setConnectionState('reconnecting');
        const nextDelay = Math.min(retryDelayRef.current * 1.5, MAX_RETRY_MS);
        retryDelayRef.current = nextDelay;

        retryTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connect();
          }
        }, nextDelay);
      };
    } catch (err) {
      console.error('Failed to initialize WebSocket connection:', err);
      setConnectionState('disconnected');
    }
  }, [startHeartbeat, stopHeartbeat]);

  /**
   * Dispatches payload to the team's shared WebSocket hub.
   */
  const sendMessage = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
        wsRef.current.send(serialized);
        console.log('📤 Successfully sent payload to Team WebSocket:', payload);
        return true;
      } catch (e) {
        console.warn('Failed to send WebSocket payload:', e);
        return false;
      }
    }
    console.warn('Team WebSocket not open yet. Payload not sent.');
    return false;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      stopHeartbeat();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) {
        intentionalCloseRef.current = true;
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, [connect, stopHeartbeat]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    sendMessage,
    wsUrl: WS_URL,
  };
}
