import { parseJsonMessage } from './publicKeyTransactions';
import { normalizeXyzTransaction } from './transactionXyz';
import type { XyzTransaction } from './types';

type PushTransactionMessageBody = {
  transaction?: XyzTransaction;
};

type FilterBlockMessageBody = {
  transactions?: XyzTransaction[];
};

type FilterResultMessageBody = {
  error?: unknown;
};

/**
 * Extracts outgoing transactions for a public key from one Cruzbit realtime
 * message. WebSocket lifecycle and reconnection are owned by react-use-websocket.
 */
export function realtimeTransactionsFromMessage(event: MessageEvent<string>, publicKey: string): XyzTransaction[] {
  const parsed = parseJsonMessage(event);
  const transactions = parsed?.type === 'push_transaction'
    ? [(parsed.body as PushTransactionMessageBody | undefined)?.transaction]
    : parsed?.type === 'filter_block'
      ? (parsed.body as FilterBlockMessageBody | undefined)?.transactions ?? []
      : [];

  return transactions
    .filter((transaction): transaction is XyzTransaction => transaction?.from === publicKey)
    .map(normalizeXyzTransaction);
}

/** Returns a server-side error reported while registering a realtime filter. */
export function realtimeFilterResultError(event: MessageEvent<string>): Error | undefined {
  const parsed = parseJsonMessage(event);

  if (parsed?.type !== 'filter_result') {
    return undefined;
  }

  const error = (parsed.body as FilterResultMessageBody | undefined)?.error;
  return typeof error === 'string' && error ? new Error(error) : undefined;
}

export function realtimeCloseError(event: CloseEvent): Error {
  const details = [
    `code ${event.code}`,
    event.reason ? `reason: ${event.reason}` : undefined,
    event.wasClean ? 'clean close' : 'unclean close',
  ].filter(Boolean).join(', ');

  return new Error(`Realtime transaction endpoint closed (${details}). Reconnecting...`);
}
