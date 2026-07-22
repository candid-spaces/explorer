import { useEffect, useMemo, useRef, useState } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { normalizeEndpoint } from './publicKeyTransactions';
import { isInvBlockMessage, realtimeFilterResultError, realtimeTransactionsFromMessage } from './realtimeTransactions';
import type { XyzTransaction, SecondaryRealtimeStatus } from './types';

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const SUSTAINED_RECONNECT_ATTEMPTS = Number.MAX_SAFE_INTEGER;

interface UseRealtimePublicKeyTransactionsOptions {
  endpoint: string;
  publicKey: string;
  onTransaction: (transaction: XyzTransaction) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: SecondaryRealtimeStatus) => void;
}

function statusForReadyState(readyState: ReadyState): SecondaryRealtimeStatus {
  switch (readyState) {
    case ReadyState.OPEN:
      return 'connected';
    case ReadyState.CLOSED:
      return 'closed';
    case ReadyState.CLOSING:
    case ReadyState.CONNECTING:
    case ReadyState.UNINSTANTIATED:
    default:
      return 'connecting';
  }
}

/**
 * Sustains a Cruzbit public-key subscription with react-use-websocket.
 * Connections to the same endpoint are shared, while each hook instance
 * registers and filters its own public key.
 */
export function useRealtimePublicKeyTransactions({
  endpoint,
  publicKey,
  onTransaction,
  onError,
  onStatusChange,
}: UseRealtimePublicKeyTransactionsOptions) {
  const watchedPublicKey = publicKey.trim();
  const normalizedEndpoint = useMemo(() => normalizeEndpoint(endpoint), [endpoint]);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [inventorySequence, setInventorySequence] = useState(0);
  const callbacksRef = useRef({ onTransaction, onError, onStatusChange });
  callbacksRef.current = { onTransaction, onError, onStatusChange };

  // Defer the initial connection until after the component has committed. This
  // avoids opening then immediately closing a socket during React StrictMode's
  // development-only effect cleanup pass.
  useEffect(() => {
    setShouldConnect(true);
  }, []);

  const { readyState, sendJsonMessage } = useWebSocket(normalizedEndpoint, {
    protocols: ['cruzbit.1'],
    share: true,
    reconnectAttempts: SUSTAINED_RECONNECT_ATTEMPTS,
    reconnectInterval: (attempt) => Math.min(
      INITIAL_RECONNECT_DELAY_MS * (2 ** attempt),
      MAX_RECONNECT_DELAY_MS,
    ),
    shouldReconnect: () => true,
    onMessage: (event) => {
      // A node announces new blocks with inv_block. Re-send our interest filter
      // so both primary declarations and secondary overlays receive the next
      // matching filter_block without maintaining separate socket machinery.
      if (isInvBlockMessage(event)) {
        setInventorySequence((sequence) => sequence + 1);
        return;
      }

      const filterError = realtimeFilterResultError(event);

      if (filterError) {
        callbacksRef.current.onError?.(filterError);
        return;
      }

      realtimeTransactionsFromMessage(event, watchedPublicKey).forEach((transaction) => {
        callbacksRef.current.onTransaction(transaction);
      });
    },
    // react-use-websocket owns reconnects after transport errors and unclean
    // closes. Only a server-reported filter_result is actionable here.
  }, Boolean(watchedPublicKey) && shouldConnect);

  useEffect(() => {
    callbacksRef.current.onStatusChange?.(statusForReadyState(readyState));
  }, [readyState]);

  useEffect(() => {
    if (readyState !== ReadyState.OPEN || !watchedPublicKey) {
      return;
    }

    // This also runs for a subscriber joining a socket already shared by an
    // existing endpoint subscription; that join does not trigger onOpen.
    sendJsonMessage({
      type: 'filter_add',
      body: { public_keys: [watchedPublicKey] },
    }, false);
  }, [inventorySequence, readyState, sendJsonMessage, watchedPublicKey]);

  return { readyState };
}
