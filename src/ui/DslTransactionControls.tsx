import type { ChangeEvent } from 'react';
import type { TransactionRange } from '../transactions/types';

interface DslTransactionControlsProps {
  endpoint: string;
  publicKey: string;
  range: TransactionRange;
  loading: boolean;
  error?: string;
  transactionCount: number;
  acceptedCount: number;
  rejectedCount: number;
  onEndpointChange: (endpoint: string) => void;
  onPublicKeyChange: (publicKey: string) => void;
  onRangeChange: (range: TransactionRange) => void;
  onReload: () => void;
}

function numberValue(event: ChangeEvent<HTMLInputElement>, fallback: number): number {
  const value = Number(event.target.value);
  return Number.isFinite(value) ? value : fallback;
}

export function DslTransactionControls({
  endpoint,
  publicKey,
  range,
  loading,
  error,
  transactionCount,
  acceptedCount,
  rejectedCount,
  onEndpointChange,
  onPublicKeyChange,
  onRangeChange,
  onReload,
}: DslTransactionControlsProps) {
  return (
    <section className="transaction-controls" aria-label="Remote DSL transaction loader">
      <div className="section-heading-row">
        <h2>Remote DSL transactions</h2>
        <button type="button" disabled={loading || !publicKey.trim()} onClick={onReload}>
          {loading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      <label>
        <span>WebSocket endpoint</span>
        <input value={endpoint} placeholder="node.example.com" onChange={(event) => onEndpointChange(event.target.value)} />
      </label>

      <label>
        <span>Public key</span>
        <input value={publicKey} placeholder="Enter a public key" onChange={(event) => onPublicKeyChange(event.target.value)} />
      </label>

      <div className="transaction-range-grid">
        <label>
          <span>Start height</span>
          <input
            type="number"
            min={0}
            value={range.startHeight}
            onChange={(event) => onRangeChange({ ...range, startHeight: numberValue(event, range.startHeight) })}
          />
        </label>
        <label>
          <span>End height</span>
          <input
            type="number"
            min={0}
            value={range.endHeight}
            onChange={(event) => onRangeChange({ ...range, endHeight: numberValue(event, range.endHeight) })}
          />
        </label>
        <label>
          <span>Limit</span>
          <input
            type="number"
            min={1}
            value={range.limit}
            onChange={(event) => onRangeChange({ ...range, limit: Math.max(1, numberValue(event, range.limit)) })}
          />
        </label>
      </div>

      <p className="transaction-status">
        {transactionCount} fetched · {acceptedCount} mapped · {rejectedCount} rejected
      </p>
      {error ? <p className="transaction-error">{error}</p> : null}
    </section>
  );
}
