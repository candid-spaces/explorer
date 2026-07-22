export interface XyzTransaction {
  time: number;
  nonce?: number;
  from?: string;
  to: string;
  amount: number;
  fee: number;
  memo: string;
  series?: number;
  signature?: string;
}

export interface TransactionRange {
  startHeight: number;
  endHeight: number;
  limit: number;
}

export interface TransactionPublicKeyEndpoint {
  publicKey: string;
  endpoint: string;
}

export interface PrimaryPublicKeyReference extends TransactionPublicKeyEndpoint {}

export interface PrimaryHistoricalBaselineXyz {
  source: string;
  rejected: RejectedTransaction[];
}

export interface RejectedTransaction {
  id: string;
  memoPreview: string;
  reasons: string[];
}

export type SecondaryRealtimeStatus = 'connecting' | 'connected' | 'closed' | 'error';

/** A secondary public key discovered in a primary transaction. */
export interface DiscoveredSecondaryPublicKeyReference extends Pick<TransactionPublicKeyEndpoint, 'publicKey'> {
  sourceTransactionId: string;
  memoPreview: string;
}

export interface ActiveSecondaryTransactionStream extends TransactionPublicKeyEndpoint {
  realtimeStatus: SecondaryRealtimeStatus;
  streamError?: string;
  transactions: XyzTransaction[];
  playbackIndex: number;
  playbackSpeed: number;
  replaying: boolean;
  historyLoading?: boolean;
  /** Diagnostics for the transaction selected by this stream's playback cursor. */
  currentTransactionRejectedDiagnostics: RejectedTransaction[];
  /** Activity for the primary key, read from this secondary node as a scene cursor. */
  originatingCursor: OriginatingPrimaryCursor;
}

/** The originating primary key as observed by a particular secondary node. */
export interface OriginatingPrimaryCursor extends TransactionPublicKeyEndpoint {
  transactions: XyzTransaction[];
  realtimeStatus: SecondaryRealtimeStatus;
  streamError?: string;
  historyLoading?: boolean;
}

export type SecondaryKeyReference = DiscoveredSecondaryPublicKeyReference;

/** A subscribed source projected into the primary spatial document. */
export interface SecondaryProjection extends ActiveSecondaryTransactionStream {
  /** Every primary transaction that discovered this unique key. */
  references: SecondaryKeyReference[];
  /** Secondary declarations only render when they consume a primary namespace. */
  compositionPolicy: 'consume-primary-namespaces';
}
