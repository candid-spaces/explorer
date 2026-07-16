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

function isAbortError(error: Error): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError';
}

function matchesPublicKey(transaction: DslTransaction, publicKey: string): boolean {
  return transaction.from === publicKey || transaction.to === publicKey;
}

function isOpenOrConnecting(socket: WebSocket): boolean {
  return socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING;
}

/**
 * Opens a long-lived Cruzbit websocket subscription for realtime transactions
 * involving a secondary/public key. Transactions are emitted in exactly the
 * order their matching push_transaction messages are received for the key.
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
  let closed = false;
  const socket = new WebSocket(normalizeEndpoint(endpoint), ['cruzbit.1']);

  const reportError = (error: Error) => {
    if (!isAbortError(error)) {
      onError?.(error);
    }
  };

  const cleanup = () => {
    socket.removeEventListener('open', handleOpen);
    socket.removeEventListener('message', handleMessage);
    socket.removeEventListener('error', handleError);
    socket.removeEventListener('close', handleClose);
    signal?.removeEventListener('abort', handleAbort);
  };

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    cleanup();
    if (isOpenOrConnecting(socket)) {
      socket.close();
    }
  };

  function handleAbort() {
    close();
  }

  function handleOpen() {
    if (!watchedPublicKey) {
      close();
      return;
    }

    onOpen?.();

    socket.send(JSON.stringify({
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
      }
      return;
    }

    if (parsed?.type !== 'push_transaction') {
      return;
    }

    const transaction = (parsed.body as PushTransactionMessageBody | undefined)?.transaction;
    if (!transaction || !matchesPublicKey(transaction, watchedPublicKey)) {
      return;
    }

    onTransaction(normalizeDslTransaction(transaction));
  }

  function handleError() {
    reportError(new Error('Unable to communicate with realtime transaction endpoint.'));
  }

  function handleClose() {
    if (closed) {
      return;
    }

    closed = true;
    cleanup();
    onClose?.();
    reportError(new Error('Realtime transaction endpoint closed.'));
  }

  signal?.addEventListener('abort', handleAbort, { once: true });
  socket.addEventListener('open', handleOpen);
  socket.addEventListener('message', handleMessage);
  socket.addEventListener('error', handleError);
  socket.addEventListener('close', handleClose);

  if (signal?.aborted) {
    handleAbort();
  }

  return { close };
}
