export interface DslTransaction {
  time?: number;
  nonce?: number;
  from?: string;
  to: string;
  amount?: number;
  fee?: number;
  memo?: string;
  series?: number;
  signature?: string;
}

export interface TransactionRange {
  startHeight: number;
  endHeight: number;
  limit: number;
}

export interface TransactionMetadata {
  publicKey: string;
  transactionIndex: number;
  from?: string;
  to: string;
  amount?: number;
  fee?: number;
  memo?: string;
  time?: number;
  signature?: string;
}

export interface TransactionDslBundle {
  source: string;
  metadataByNamespace: Record<string, TransactionMetadata>;
}
