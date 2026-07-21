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
