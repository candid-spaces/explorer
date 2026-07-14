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

export interface RejectedTransaction {
  id: string;
  memoPreview: string;
  reasons: string[];
}

export interface SecondaryKeyReference {
  publicKey: string;
  endpoint: string;
  sourceTransactionId: string;
  memoPreview: string;
}
