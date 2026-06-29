import type { ReactNode } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';
import type { RejectedTransaction, TransactionRange } from '../transactions/types';
import { DslEditor } from './DslEditor';
import { DslTransactionControls } from './DslTransactionControls';
import { DslTreeView } from './DslTreeView';

function describeAuthoringState(
  hasRemoteBaseline: boolean,
  hasAuthoringEdits: boolean,
  remoteBaselineChanged: boolean,
): string {
  if (!hasRemoteBaseline) {
    return 'Editing local DSL declarations. Use bare path numbers for paces and a c suffix for centipaces.';
  }

  if (remoteBaselineChanged && hasAuthoringEdits) {
    return 'Remote declarations changed after local edits. Keep editing, or reset to the latest remote state.';
  }

  if (hasAuthoringEdits) {
    return 'Local draft differs from the loaded remote declarations. Edit, remove, or add declarations below.';
  }

  return 'Loaded from remote transactions. Edit, remove, or add declarations below.';
}

function summarizeChanges({ added, removed }: { added: number; removed: number }): string {
  const parts: string[] = [];

  if (added > 0) {
    parts.push(`${added} added`);
  }

  if (removed > 0) {
    parts.push(`${removed} removed`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No line changes';
}

function renderAuthoringStatus(
  hasRemoteBaseline: boolean,
  hasAuthoringEdits: boolean,
  remoteBaselineChanged: boolean,
  authoringChangeSummary: { added: number; removed: number },
): ReactNode {
  if (!hasRemoteBaseline) {
    return <em className="dsl-status-badge">Local sample</em>;
  }

  if (remoteBaselineChanged && hasAuthoringEdits) {
    return (
      <>
        <em className="dsl-status-badge dsl-status-badge-warning">Remote changed</em>
        <span>{summarizeChanges(authoringChangeSummary)}</span>
      </>
    );
  }

  if (hasAuthoringEdits) {
    return (
      <>
        <em className="dsl-status-badge dsl-status-badge-warning">Modified locally</em>
        <span>{summarizeChanges(authoringChangeSummary)}</span>
      </>
    );
  }

  return <em className="dsl-status-badge dsl-status-badge-success">Remote baseline loaded</em>;
}

interface DslDrawerProps {
  document: SpatialDocument;
  isOpen: boolean;
  source: string;
  transactionPublicKey: string;
  transactionPublicKeyShareUrl?: string;
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
  hasRemoteBaseline: boolean;
  hasAuthoringEdits: boolean;
  remoteBaselineChanged: boolean;
  authoringChangeSummary: { added: number; removed: number };
  onChange: (source: string) => void;
  onResetToRemote: () => void;
  onToggle: () => void;
  onTransactionPublicKeyChange: (publicKey: string) => void;
  onTransactionRangeChange: (range: TransactionRange) => void;
  onReloadTransactions: () => void;
  onUseTransactionTip: () => void;
}

export function DslDrawer({
  document,
  isOpen,
  source,
  transactionPublicKey,
  transactionPublicKeyShareUrl,
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
  hasRemoteBaseline,
  hasAuthoringEdits,
  remoteBaselineChanged,
  authoringChangeSummary,
  onChange,
  onResetToRemote,
  onToggle,
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
            publicKey={transactionPublicKey}
            publicKeyShareUrl={transactionPublicKeyShareUrl}
            range={transactionRange}
            loading={transactionsLoading}
            error={transactionError}
            tipHeight={tipHeight}
            tipLoading={tipLoading}
            tipError={tipError}
            transactionCount={transactionCount}
            acceptedCount={acceptedTransactionCount}
            rejectedCount={rejectedTransactions.length}
            onPublicKeyChange={onTransactionPublicKeyChange}
            onRangeChange={onTransactionRangeChange}
            onReload={onReloadTransactions}
            onUseTip={onUseTransactionTip}
          />

          <DslEditor
            actions={
              <button type="button" disabled={!hasRemoteBaseline || !hasAuthoringEdits} onClick={onResetToRemote}>
                Reset to remote
              </button>
            }
            description={describeAuthoringState(hasRemoteBaseline, hasAuthoringEdits, remoteBaselineChanged)}
            status={renderAuthoringStatus(
              hasRemoteBaseline,
              hasAuthoringEdits,
              remoteBaselineChanged,
              authoringChangeSummary,
            )}
            value={source}
            onChange={onChange}
          />

          {mappedTransactionSource.trim().length > 0 ? (
            <details className="remote-baseline-reference">
              <summary>Original remote declarations</summary>
              <label className="dsl-editor dsl-editor-readonly">
                <span>Mapped transaction DSL</span>
                <small>Current remote baseline used for reset.</small>
                <textarea spellCheck={false} value={mappedTransactionSource} wrap="off" readOnly />
              </label>
            </details>
          ) : null}

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
        </div>
      ) : null}
    </aside>
  );
}
