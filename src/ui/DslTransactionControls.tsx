import type { ChangeEvent } from 'react';
import type { TransactionRange } from '../transactions/types';

interface DslTransactionControlsProps {
  endpoint: string;
  publicKey: string;
  range: TransactionRange;
  loading: boolean;
  tipHeight?: number;
  tipLoading: boolean;
  error?: string;
  tipError?: string;
  transactionCount: number;
  acceptedCount: number;
  rejectedCount: number;
  onEndpointChange: (endpoint: string) => void;
  onPublicKeyChange: (publicKey: string) => void;
  onRangeChange: (range: TransactionRange) => void;
  onReload: () => void;
  onUseTip: () => void;
}

function numberValue(event: ChangeEvent<HTMLInputElement>, fallback: number): number {
  const value = Number(event.target.value);
  return Number.isFinite(value) ? value : fallback;
}

function clampHeight(value: number, max: number): number {
  return Math.min(Math.max(Math.round(value), 0), max);
}

export function DslTransactionControls({
  endpoint,
  publicKey,
  range,
  loading,
  tipHeight,
  tipLoading,
  error,
  tipError,
  transactionCount,
  acceptedCount,
  rejectedCount,
  onEndpointChange,
  onPublicKeyChange,
  onRangeChange,
  onReload,
  onUseTip,
}: DslTransactionControlsProps) {
  const sliderMax = Math.max(tipHeight ?? 0, range.startHeight, range.endHeight, 1);
  const lowerHeight = Math.min(range.startHeight, range.endHeight);
  const upperHeight = Math.max(range.startHeight, range.endHeight);

  function updateWindow(nextLower: number, nextUpper: number) {
    onRangeChange({
      ...range,
      startHeight: clampHeight(Math.max(nextLower, nextUpper), sliderMax),
      endHeight: clampHeight(Math.min(nextLower, nextUpper), sliderMax),
    });
  }

  return (
    <section className="transaction-controls" aria-label="Remote DSL transaction loader">
      <div className="section-heading-row">
        <h2>Remote DSL transactions</h2>
        <button type="button" disabled={loading || !publicKey.trim()} onClick={onReload}>
          {loading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      <details className="transaction-config">
        <summary>Remote config</summary>

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

        <div className="transaction-tip-row">
          <button type="button" disabled={tipLoading || !endpoint.trim()} onClick={onUseTip}>
            {tipLoading ? 'Loading tip…' : 'Set start to tip'}
          </button>
          <span>{tipHeight === undefined ? 'Tip unknown' : `Tip: ${tipHeight}`}</span>
        </div>

        <div className="transaction-range-slider" aria-label="Height window range">
          <label>
            <span>End height slider</span>
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={1}
              value={lowerHeight}
              onChange={(event) => updateWindow(Number(event.target.value), upperHeight)}
            />
          </label>
          <label>
            <span>Start height slider</span>
            <input
              type="range"
              min={0}
              max={sliderMax}
              step={1}
              value={upperHeight}
              onChange={(event) => updateWindow(lowerHeight, Number(event.target.value))}
            />
          </label>
          <small>Height window: {lowerHeight} - {upperHeight}</small>
        </div>
      </details>

      <p className="transaction-status">
        {transactionCount} fetched · {acceptedCount} mapped · {rejectedCount} rejected
      </p>
      {error ? <p className="transaction-error">{error}</p> : null}
      {tipError ? <p className="transaction-error">{tipError}</p> : null}
    </section>
  );
}
