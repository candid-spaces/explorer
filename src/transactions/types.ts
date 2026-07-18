export interface DslTransaction {
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

export interface PrimaryHistoricalBaselineDsl {
  source: string;
  rejected: RejectedTransaction[];
}

export interface RejectedTransaction {
  id: string;
  memoPreview: string;
  reasons: string[];
}

export type SecondaryEndpointSource = 'node-url-address' | 'default-secondary';

export type SecondaryRealtimeStatus = 'connecting' | 'connected' | 'closed' | 'error';

export interface DiscoveredSecondaryPublicKeyReference extends TransactionPublicKeyEndpoint {
  endpointSource: SecondaryEndpointSource;
  sourceTransactionId: string;
  memoPreview: string;
}

export interface ActiveSecondaryTransactionStream extends TransactionPublicKeyEndpoint {
  endpointSource: SecondaryEndpointSource;
  realtimeStatus: SecondaryRealtimeStatus;
  streamError?: string;
  transactions: DslTransaction[];
  playbackIndex: number;
  playbackSpeed: number;
  replaying: boolean;
  historyLoading?: boolean;
  /** Diagnostics for the transaction selected by this stream's playback cursor. */
  currentTransactionRejectedDiagnostics: RejectedTransaction[];
}

export type SecondaryKeyReference = DiscoveredSecondaryPublicKeyReference;
