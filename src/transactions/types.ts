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

export interface DiscoveredSecondaryPublicKeyReference extends TransactionPublicKeyEndpoint {
  sourceTransactionId: string;
  memoPreview: string;
}

export interface ActiveSecondaryTransactionStream extends TransactionPublicKeyEndpoint {
  transactions: DslTransaction[];
  playbackIndex: number;
  replaying: boolean;
  historyLoading?: boolean;
}

export type Vector3Tuple = [number, number, number];

export interface SecondaryAnimationEvent {
  kind: 'secondary-animation';
  targetPath: string;
  targetObjectId?: string;
  position?: Vector3Tuple;
  size?: Vector3Tuple;
  rotation?: Vector3Tuple;
  timestamp: number;
  sourceTransactionId: string;
  transactionIndex: number;
}

export interface SecondarySceneReplayCursor {
  timestamp?: number;
  transactionIndex?: number;
}

export type SecondaryKeyReference = DiscoveredSecondaryPublicKeyReference;
