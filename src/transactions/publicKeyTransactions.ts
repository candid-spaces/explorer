import type { DslTransaction, TransactionRange } from './types';

export interface PublicKeyTransactionRequest {
  endpoint: string;
  publicKey: string;
  range: TransactionRange;
  signal?: AbortSignal;
}

function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim();

  if (!trimmed) {
    throw new Error('A WebSocket endpoint is required.');
  }

  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `wss://${trimmed}`;
}

export function fetchPublicKeyTransactions({
  endpoint,
  publicKey,
  range,
  signal,
}: PublicKeyTransactionRequest): Promise<DslTransaction[]> {
  if (!publicKey.trim()) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const socket = new WebSocket(normalizeEndpoint(endpoint), ['cruzbit.1']);

    const cleanup = () => {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('message', handleMessage);
      socket.removeEventListener('error', handleError);
      socket.removeEventListener('close', handleClose);
      signal?.removeEventListener('abort', handleAbort);
    };

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
      callback();
    };

    function handleAbort() {
      finish(() => reject(new DOMException('Transaction request was aborted.', 'AbortError')));
    }

    function handleOpen() {
      socket.send(JSON.stringify({
        type: 'get_public_key_transactions',
        body: {
          public_key: publicKey,
          start_height: range.startHeight,
          end_height: range.endHeight,
          limit: range.limit,
        },
      }));
    }

    function handleMessage(event: MessageEvent<string>) {
      let parsed: unknown;

      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      if (!parsed || typeof parsed !== 'object') {
        return;
      }

      const { type, body } = parsed as {
        type?: string;
        body?: {
          public_key?: string;
          filter_blocks?: { transactions?: DslTransaction[] }[];
          transactions?: DslTransaction[];
        };
      };

      if (type !== 'public_key_transactions' || body?.public_key !== publicKey) {
        return;
      }

      const transactions = body.filter_blocks?.flatMap((block) => block.transactions ?? []) ?? body.transactions ?? [];
      finish(() => resolve(transactions));
    }

    function handleError() {
      finish(() => reject(new Error('Unable to load public-key transactions.')));
    }

    function handleClose() {
      finish(() => reject(new Error('Transaction endpoint closed before returning transactions.')));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
    socket.addEventListener('open', handleOpen);
    socket.addEventListener('message', handleMessage);
    socket.addEventListener('error', handleError);
    socket.addEventListener('close', handleClose);
  });
}
