import { parseJsonMessage } from './publicKeyTransactions';
import { normalizeXyzDslTransaction } from './transactionXyzDsl';
import type { XyzDslTransaction } from './types';

type PushTransactionMessageBody = {
  transaction?: XyzDslTransaction;
};

type FilterBlockMessageBody = {
  transactions?: XyzDslTransaction[];
};

type FilterResultMessageBody = {
  error?: unknown;
};

/** True when a peer announces a block, which is the protocol's cue to refresh a filter. */
export function isInvBlockMessage(event: MessageEvent<string>): boolean {
  return parseJsonMessage(event)?.type === 'inv_block';
}

/**
 * Extracts outgoing transactions for a public key from one Cruzbit realtime
 * message. WebSocket lifecycle and reconnection are owned by react-use-websocket.
 */
export function realtimeTransactionsFromMessage(event: MessageEvent<string>, publicKey: string): XyzDslTransaction[] {
  const parsed = parseJsonMessage(event);
  const transactions = parsed?.type === 'push_transaction'
    ? [(parsed.body as PushTransactionMessageBody | undefined)?.transaction]
    : parsed?.type === 'filter_block'
      ? (parsed.body as FilterBlockMessageBody | undefined)?.transactions ?? []
      : [];

  return transactions
    .filter((transaction): transaction is XyzDslTransaction => transaction?.from === publicKey)
    .map(normalizeXyzDslTransaction);
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
