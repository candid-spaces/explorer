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
  transactionCount: number;
  acceptedTransactionCount: number;
  rejectedTransactions: RejectedTransaction[];
  onChange: (source: string) => void;
  onToggle: () => void;
  onTransactionEndpointChange: (endpoint: string) => void;
  onTransactionPublicKeyChange: (publicKey: string) => void;
  onTransactionRangeChange: (range: TransactionRange) => void;
  onReloadTransactions: () => void;
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
  transactionCount,
  acceptedTransactionCount,
  rejectedTransactions,
  onChange,
  onToggle,
  onTransactionEndpointChange,
  onTransactionPublicKeyChange,
  onTransactionRangeChange,
  onReloadTransactions,
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
            transactionCount={transactionCount}
            acceptedCount={acceptedTransactionCount}
            rejectedCount={rejectedTransactions.length}
            onEndpointChange={onTransactionEndpointChange}
            onPublicKeyChange={onTransactionPublicKeyChange}
            onRangeChange={onTransactionRangeChange}
            onReload={onReloadTransactions}
          />

          <DslEditor value={source} onChange={onChange} />

          {document.diagnostics.length > 0 ? (
            <section className="diagnostics" aria-label="DSL parse diagnostics">
              <h2>Diagnostics</h2>
              <ul>
                {document.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.line}-${index}`}>
                    <strong>Line {diagnostic.line}:</strong> {diagnostic.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {rejectedTransactions.length > 0 ? (
            <section className="diagnostics" aria-label="Remote transaction diagnostics">
              <h2>Remote transaction diagnostics</h2>
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
            </section>
          ) : null}

          <DslTreeView document={document} />

          <ObjectList document={document} />
        </div>
      ) : null}
    </aside>
  );
}
