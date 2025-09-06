import { useState, useEffect, useCallback, useRef } from 'react';

interface WebSocketMessage {
  data: string;
}

export function useWebSocket(userId: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'Connecting' | 'Open' | 'Closing' | 'Closed'>('Closed');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!userId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnectionStatus('Open');
      setSocket(ws);
      
      // Authenticate user
      ws.send(JSON.stringify({
        type: 'auth',
        userId: userId
      }));
    };

    ws.onmessage = (event) => {
      setLastMessage({ data: event.data });
    };

    ws.onclose = () => {
      setConnectionStatus('Closed');
      setSocket(null);
      
      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        if (userId) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Closed');
    };

    return ws;
  }, [userId]);

  useEffect(() => {
    if (userId) {
      setConnectionStatus('Connecting');
      const ws = connect();
      
      return () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        if (ws) {
          ws.close();
        }
      };
    }
  }, [userId, connect]);

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  return {
    sendMessage,
    lastMessage,
    connectionStatus
  };
}
