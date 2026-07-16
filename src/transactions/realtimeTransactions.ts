import { normalizeEndpoint, parseJsonMessage } from './publicKeyTransactions';
import { normalizeDslTransaction } from './transactionDsl';
import type { DslTransaction } from './types';

export interface RealtimePublicKeyTransactionSubscription {
  close: () => void;
}

export interface SubscribePublicKeyTransactionsOptions {
  endpoint: string;
  publicKey: string;
  signal?: AbortSignal;
  onTransaction: (transaction: DslTransaction) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

type PushTransactionMessageBody = {
  transaction?: DslTransaction;
};

type FilterBlockMessageBody = {
  transactions?: DslTransaction[];
};

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function isAbortError(error: Error): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

function matchesPublicKey(transaction: DslTransaction, publicKey: string): boolean {
  return transaction.from === publicKey;
}

function isOpenOrConnecting(socket: WebSocket): boolean {
  return socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING;
}

function realtimeCloseError(event: CloseEvent): Error {
  const details = [
    `code ${event.code}`,
    event.reason ? `reason: ${event.reason}` : undefined,
    event.wasClean ? 'clean close' : 'unclean close',
  ].filter(Boolean).join(', ');

  return new Error(`Realtime transaction endpoint closed (${details}). Reconnecting...`);
}

/**
 * Opens a long-lived Cruzbit websocket subscription for realtime transactions
 * sent by a secondary/public key. Transactions are emitted in exactly the
 * order their matching push_transaction and filter_block messages are received
 * for the key.
 */
export function subscribePublicKeyTransactions({
  endpoint,
  publicKey,
  signal,
  onTransaction,
  onError,
  onOpen,
  onClose,
}: SubscribePublicKeyTransactionsOptions): RealtimePublicKeyTransactionSubscription {
  const watchedPublicKey = publicKey.trim();
  const normalizedEndpoint = normalizeEndpoint(endpoint);
  let closed = false;
  let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let socket: WebSocket | undefined;
  let cleanupSocket: (() => void) | undefined;

  const reportError = (error: Error) => {
    if (!isAbortError(error)) {
      onError?.(error);
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  };

  const cleanupCurrentSocket = () => {
    cleanupSocket?.();
    cleanupSocket = undefined;
  };

  const markSubscriptionHealthy = () => {
    reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
  };

  const scheduleReconnect = () => {
    if (closed || signal?.aborted || reconnectTimer !== undefined) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, reconnectDelayMs);
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
  };

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    clearReconnectTimer();
    cleanupCurrentSocket();
    signal?.removeEventListener('abort', handleAbort);

    if (socket && isOpenOrConnecting(socket)) {
      socket.close();
    }
  };

  function handleAbort() {
    close();
  }

  function connect() {
    if (closed || signal?.aborted) {
      return;
    }

    const nextSocket = new WebSocket(normalizedEndpoint, ['cruzbit.1']);
    socket = nextSocket;

    const cleanup = () => {
      nextSocket.removeEventListener('open', handleOpen);
      nextSocket.removeEventListener('message', handleMessage);
      nextSocket.removeEventListener('error', handleError);
      nextSocket.removeEventListener('close', handleClose);
    };

    cleanupSocket = cleanup;

    function handleOpen() {
      if (!watchedPublicKey) {
        close();
        return;
      }

      onOpen?.();

      nextSocket.send(JSON.stringify({
        type: 'filter_add',
        body: {
          public_keys: [watchedPublicKey],
        },
      }));
    }

    function handleMessage(event: MessageEvent<string>) {
      const parsed = parseJsonMessage(event);

      if (parsed?.type === 'filter_result') {
        const error = (parsed.body as { error?: unknown } | undefined)?.error;
        if (typeof error === 'string' && error) {
          reportError(new Error(error));
        } else {
          markSubscriptionHealthy();
        }
        return;
      }

      const transactions = parsed?.type === 'push_transaction'
        ? [(parsed.body as PushTransactionMessageBody | undefined)?.transaction]
        : parsed?.type === 'filter_block'
          ? (parsed.body as FilterBlockMessageBody | undefined)?.transactions ?? []
          : [];

      for (const transaction of transactions) {
        if (!transaction || !matchesPublicKey(transaction, watchedPublicKey)) {
          continue;
        }

        markSubscriptionHealthy();
        onTransaction(normalizeDslTransaction(transaction));
      }
    }

    function handleError() {
      reportError(new Error('Unable to communicate with realtime transaction endpoint.'));
    }

    function handleClose(event: CloseEvent) {
      cleanup();

      if (cleanupSocket === cleanup) {
        cleanupSocket = undefined;
      }

      if (socket === nextSocket) {
        socket = undefined;
      }

      if (closed) {
        return;
      }

      onClose?.();
      reportError(realtimeCloseError(event));
      scheduleReconnect();
    }

    nextSocket.addEventListener('open', handleOpen);
    nextSocket.addEventListener('message', handleMessage);
    nextSocket.addEventListener('error', handleError);
    nextSocket.addEventListener('close', handleClose);
  }

  signal?.addEventListener('abort', handleAbort, { once: true });
  connect();

  if (signal?.aborted) {
    handleAbort();
  }

  return { close };
}
