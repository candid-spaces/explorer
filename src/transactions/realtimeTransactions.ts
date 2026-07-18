import { parseJsonMessage } from './publicKeyTransactions';
import { normalizeDslTransaction } from './transactionDsl';
import type { DslTransaction } from './types';

type PushTransactionMessageBody = {
  transaction?: DslTransaction;
};

type FilterBlockMessageBody = {
  transactions?: DslTransaction[];
};

/**
 * Extracts outgoing transactions for a public key from one Cruzbit realtime
 * message. WebSocket lifecycle and reconnection are owned by react-use-websocket.
 */
export function realtimeTransactionsFromMessage(event: MessageEvent<string>, publicKey: string): DslTransaction[] {
  const parsed = parseJsonMessage(event);
  const transactions = parsed?.type === 'push_transaction'
    ? [(parsed.body as PushTransactionMessageBody | undefined)?.transaction]
    : parsed?.type === 'filter_block'
      ? (parsed.body as FilterBlockMessageBody | undefined)?.transactions ?? []
      : [];

  return transactions
    .filter((transaction): transaction is DslTransaction => transaction?.from === publicKey)
    .map(normalizeDslTransaction);
}

export function realtimeCloseError(event: CloseEvent): Error {
  const details = [
    `code ${event.code}`,
    event.reason ? `reason: ${event.reason}` : undefined,
    event.wasClean ? 'clean close' : 'unclean close',
  ].filter(Boolean).join(', ');

  return new Error(`Realtime transaction endpoint closed (${details}). Reconnecting...`);
}
