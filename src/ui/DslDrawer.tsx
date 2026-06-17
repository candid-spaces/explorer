import type { SpatialDocument } from '../model/SpatialDocument';
import type { RejectedTransaction, TransactionRange } from '../transactions/types';
import { DslEditor } from './DslEditor';
import { DslTransactionControls } from './DslTransactionControls';
import { DslTreeView } from './DslTreeView';
import { ObjectList } from './ObjectList';

interface DslDrawerProps {
  document: SpatialDocument;
  isOpen: boolean;
  source: string;
  transactionEndpoint: string;
  transactionPublicKey: string;
  transactionRange: TransactionRange;
  transactionsLoading: boolean;
  transactionError?: string;
  tipHeight?: number;
  tipLoading: boolean;
  tipError?: string;
  transactionCount: number;
  acceptedTransactionCount: number;
  mappedTransactionSource: string;
  rejectedTransactions: RejectedTransaction[];
  onChange: (source: string) => void;
  onToggle: () => void;
  onTransactionEndpointChange: (endpoint: string) => void;
  onTransactionPublicKeyChange: (publicKey: string) => void;
  onTransactionRangeChange: (range: TransactionRange) => void;
  onReloadTransactions: () => void;
  onUseTransactionTip: () => void;
}

export function DslDrawer({
  document,
  isOpen,
  source,
  transactionEndpoint,
  transactionPublicKey,
  transactionRange,
  transactionsLoading,
  transactionError,
  tipHeight,
  tipLoading,
  tipError,
  transactionCount,
  acceptedTransactionCount,
  mappedTransactionSource,
  rejectedTransactions,
  onChange,
  onToggle,
  onTransactionEndpointChange,
  onTransactionPublicKeyChange,
  onTransactionRangeChange,
  onReloadTransactions,
  onUseTransactionTip,
}: DslDrawerProps) {
  return (
    <aside className={`dsl-drawer ${isOpen ? 'is-open' : ''}`}>
      <button className="drawer-toggle" type="button" onClick={onToggle}>
        {isOpen ? 'Close DSL' : 'Edit DSL'}
      </button>

      {isOpen ? (
        <div className="drawer-panel">
          <header>
            <p className="eyebrow">Coordinate Spaces</p>
            <p>Compose primitive geometry in a shared coordinate space.</p>
          </header>

          <DslTransactionControls
            endpoint={transactionEndpoint}
            publicKey={transactionPublicKey}
            range={transactionRange}
            loading={transactionsLoading}
            error={transactionError}
            tipHeight={tipHeight}
            tipLoading={tipLoading}
            tipError={tipError}
            transactionCount={transactionCount}
            acceptedCount={acceptedTransactionCount}
            rejectedCount={rejectedTransactions.length}
            onEndpointChange={onTransactionEndpointChange}
            onPublicKeyChange={onTransactionPublicKeyChange}
            onRangeChange={onTransactionRangeChange}
            onReload={onReloadTransactions}
            onUseTip={onUseTransactionTip}
          />

          {mappedTransactionSource.trim().length > 0 ? (
            <label className="dsl-editor dsl-editor-readonly">
              <span>Mapped transaction DSL</span>
              <small>Accepted outgoing transactions are rendered from this read-only DSL.</small>
              <textarea spellCheck={false} value={mappedTransactionSource} wrap="off" readOnly />
            </label>
          ) : null}

          <DslEditor value={source} onChange={onChange} />

          {document.diagnostics.length > 0 ? (
            <details className="diagnostics" aria-label="DSL parse diagnostics">
              <summary>Diagnostics</summary>
              <ul>
                {document.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.line}-${index}`}>
                    <strong>Line {diagnostic.line}:</strong> {diagnostic.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {rejectedTransactions.length > 0 ? (
            <details className="diagnostics" aria-label="Remote transaction diagnostics">
              <summary>Remote transaction diagnostics</summary>
              <ul>
                {rejectedTransactions.map((rejection) => (
                  <li key={rejection.id}>
                    <strong>{rejection.id}:</strong> {rejection.memoPreview || '(empty memo)'}
                    <ul>
                      {rejection.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <DslTreeView document={document} />

          <ObjectList document={document} />
        </div>
      ) : null}
    </aside>
  );
}
