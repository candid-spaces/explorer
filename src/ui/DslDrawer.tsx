import type { ReactNode } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';
import { UNIT_SCALE_DESCRIPTION } from '../model/units';
import { PLAYBACK_SPEED_OPTIONS } from '../transactions/streamTransactions';
import type { ActiveSecondaryTransactionStream, DslTransaction, RejectedTransaction, SecondaryKeyReference, TransactionRange } from '../transactions/types';
import { DslEditor } from './DslEditor';
import { DslTransactionControls } from './DslTransactionControls';
import { DslTreeView } from './DslTreeView';

function describeAuthoringState(
  hasRemoteBaseline: boolean,
  hasAuthoringEdits: boolean,
  remoteBaselineChanged: boolean,
): string {
  if (!hasRemoteBaseline) {
    return `Editing local spatial declarations. Use bare path numbers for units and a c suffix for centiunits (${UNIT_SCALE_DESCRIPTION}).`;
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

function groupSecondaryTransactionStreams(
  streams: readonly ActiveSecondaryTransactionStream[],
): Map<string, ActiveSecondaryTransactionStream[]> {
  const grouped = new Map<string, ActiveSecondaryTransactionStream[]>();

  streams.forEach((stream) => {
    grouped.set(stream.publicKey, [...(grouped.get(stream.publicKey) ?? []), stream]);
  });

  return grouped;
}

function describeEndpointSource(source: SecondaryKeyReference['endpointSource']): string {
  return source === 'node-url-address' ? 'node: url_address' : 'Primary fallback';
}

function transactionSummary(transaction: DslTransaction): string {
  const memo = transaction.memo.trim();
  const parts = [
    transaction.from ? `from ${transaction.from}` : undefined,
    `to ${transaction.to}`,
    memo ? `memo ${memo}` : undefined,
  ].filter(Boolean);

  return parts.join(' · ');
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
  appMode: 'viewer' | 'editor';
  document: SpatialDocument;
  isOpen: boolean;
  source: string;
  selectedLineNumber?: number;
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
  secondaryKeyReferences: SecondaryKeyReference[];
  secondaryTransactionStreams: ActiveSecondaryTransactionStream[];
  hasRemoteBaseline: boolean;
  hasAuthoringEdits: boolean;
  remoteBaselineChanged: boolean;
  authoringChangeSummary: { added: number; removed: number };
  onChange: (source: string) => void;
  onModeChange: (mode: 'viewer' | 'editor') => void;
  onResetToRemote: () => void;
  onTransactionPublicKeyChange: (publicKey: string) => void;
  onTransactionRangeChange: (range: TransactionRange) => void;
  onReloadTransactions: () => void;
  onUseTransactionTip: () => void;
  onSecondaryReplay: (publicKey: string, endpoint: string) => void;
  onSecondaryPlaybackToggle: (publicKey: string, endpoint: string) => void;
  onSecondaryPlaybackSpeedChange: (publicKey: string, endpoint: string, playbackSpeed: number) => void;
  onSecondaryPlaybackSeek: (publicKey: string, endpoint: string, playbackIndex: number) => void;
  onLoadSecondaryHistory: (publicKey: string, endpoint: string) => void;
  selectedNodeId?: string;
  onSelectNode?: (id: string) => void;
}

export function DslDrawer({
  appMode,
  document,
  isOpen,
  source,
  selectedLineNumber,
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
  secondaryKeyReferences,
  secondaryTransactionStreams,
  hasRemoteBaseline,
  hasAuthoringEdits,
  remoteBaselineChanged,
  authoringChangeSummary,
  onChange,
  onModeChange,
  onResetToRemote,
  onTransactionPublicKeyChange,
  onTransactionRangeChange,
  onReloadTransactions,
  onUseTransactionTip,
  onSecondaryReplay,
  onSecondaryPlaybackToggle,
  onSecondaryPlaybackSpeedChange,
  onSecondaryPlaybackSeek,
  onLoadSecondaryHistory,
  selectedNodeId,
  onSelectNode,
}: DslDrawerProps) {
  const isEditorMode = appMode === 'editor';
  const secondaryTransactionStreamsByPublicKey = groupSecondaryTransactionStreams(secondaryTransactionStreams);

  return (
    <aside className={`dsl-drawer dsl-drawer--${appMode} ${isOpen ? 'is-open' : ''}`}>
      <div className="mode-controls" aria-label="Application mode">
        <button
          className="mode-toggle"
          type="button"
          aria-pressed={isEditorMode}
          onClick={() => onModeChange(isEditorMode ? 'viewer' : 'editor')}
        >
          {isEditorMode ? 'Viewer mode' : 'Editor mode'}
        </button>

      </div>

      {isEditorMode && isOpen ? (
        <div className="drawer-panel">
          <button className="drawer-close-button" type="button" aria-label="Close declarations and return to viewer mode" onClick={() => onModeChange('viewer')}>
            ×
          </button>

          <header>
            <p className="eyebrow">Candid Spaces</p>
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
            secondaryKeyCount={secondaryKeyReferences.length}
            secondaryKeyReferences={secondaryKeyReferences}
            secondaryTransactionStreams={secondaryTransactionStreams}
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
            selectedLineNumber={selectedLineNumber}
            value={source}
            onChange={onChange}
          />

          {mappedTransactionSource.trim().length > 0 ? (
            <details className="remote-baseline-reference">
              <summary>Original remote declarations</summary>
              <label className="dsl-editor dsl-editor-readonly">
                <span>Mapped spatial declarations</span>
                <small>Current remote baseline used for reset.</small>
                <textarea spellCheck={false} value={mappedTransactionSource} wrap="off" readOnly />
              </label>
            </details>
          ) : null}

          {secondaryKeyReferences.length > 0 ? (
            <details className="secondary-key-references" aria-label="Secondary key transaction references" open>
              <summary>Secondary key references ({secondaryKeyReferences.length})</summary>
              <ul>
                {secondaryKeyReferences.map((reference) => (
                  <li key={reference.sourceTransactionId}>
                    <strong>{reference.publicKey}</strong>
                    <dl>
                      <div>
                        <dt>Endpoint</dt>
                        <dd>{reference.endpoint || '(none)'}</dd>
                      </div>
                      <div>
                        <dt>Endpoint source</dt>
                        <dd>{describeEndpointSource(reference.endpointSource)}</dd>
                      </div>
                      <div>
                        <dt>Source transaction</dt>
                        <dd>{reference.sourceTransactionId}</dd>
                      </div>
                      <div>
                        <dt>Memo</dt>
                        <dd>{reference.memoPreview || '(empty memo)'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {secondaryTransactionStreams.length > 0 ? (
            <details className="secondary-transaction-streams" aria-label="Secondary transaction streams" open>
              <summary>Secondary transaction streams ({secondaryTransactionStreams.length})</summary>
              <ul>
                {[...secondaryTransactionStreamsByPublicKey.entries()].map(([publicKey, streams]) => (
                  <li key={publicKey}>
                    <strong>{publicKey}</strong>
                    <ul>
                      {streams.map((stream) => (
                        <li key={`${stream.publicKey}-${stream.endpoint}`}>
                          <span className="secondary-transaction-stream-endpoint">{stream.endpoint || '(primary endpoint)'}</span>
                          <dl className="secondary-transaction-stream-state">
                            <div>
                              <dt>Endpoint source</dt>
                              <dd>{describeEndpointSource(stream.endpointSource)}</dd>
                            </div>
                            <div>
                              <dt>Realtime</dt>
                              <dd>{stream.realtimeStatus}</dd>
                            </div>
                            <div>
                              <dt>Outgoing</dt>
                              <dd>{stream.transactions.length}</dd>
                            </div>
                            <div>
                              <dt>Mode</dt>
                              <dd>{stream.replaying ? 'Playback' : stream.transactions.length > 0 ? 'Playback paused' : 'Realtime'}</dd>
                            </div>
                          </dl>
                          {stream.streamError ? <p className="transaction-error">{stream.streamError}</p> : null}
                          <div className="secondary-transaction-stream-actions">
                            <button type="button" disabled={stream.transactions.length === 0} onClick={() => onSecondaryReplay(stream.publicKey, stream.endpoint)}>
                              Replay
                            </button>
                            <button type="button" disabled={stream.transactions.length === 0 || (!stream.replaying && stream.playbackIndex >= stream.transactions.length - 1)} onClick={() => onSecondaryPlaybackToggle(stream.publicKey, stream.endpoint)}>
                              {stream.replaying ? 'Pause' : 'Play'}
                            </button>
                            <label>
                              Playback speed
                              <select
                                value={stream.playbackSpeed}
                                onChange={(event) => onSecondaryPlaybackSpeedChange(
                                  stream.publicKey,
                                  stream.endpoint,
                                  Number(event.target.value),
                                )}
                              >
                                {PLAYBACK_SPEED_OPTIONS.map((speed) => (
                                  <option key={speed} value={speed}>{speed}x</option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Historical frame
                              <input
                                type="range"
                                min={0}
                                max={Math.max(stream.transactions.length - 1, 0)}
                                step={1}
                                value={stream.playbackIndex}
                                disabled={stream.transactions.length === 0}
                                onChange={(event) => onSecondaryPlaybackSeek(
                                  stream.publicKey,
                                  stream.endpoint,
                                  Number(event.target.value),
                                )}
                              />
                            </label>
                            <button type="button" disabled={stream.historyLoading} onClick={() => onLoadSecondaryHistory(stream.publicKey, stream.endpoint)}>
                              {stream.historyLoading ? 'Loading history…' : 'Load historical range'}
                            </button>
                            <span>{stream.transactions.length > 0 ? stream.playbackIndex + 1 : 0}/{stream.transactions.length} frame</span>
                          </div>
                          {stream.transactions.length > 0 ? (
                            <ol>
                              {stream.transactions.map((transaction, index) => (
                                <li key={`${transaction.time}-${transaction.series ?? 'none'}-${transaction.nonce ?? index}`}>
                                  <time>{new Date(transaction.time * 1000).toLocaleString()}</time>
                                  <span>{transactionSummary(transaction)}</span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p>Listening for transactions…</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}


          {document.diagnostics.length > 0 ? (
            <details className="diagnostics" aria-label="Spatial declaration diagnostics">
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
            <details className="diagnostics" aria-label="Spatial transaction diagnostics">
              <summary>Spatial transaction diagnostics</summary>
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

          <DslTreeView document={document} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
        </div>
      ) : null}
    </aside>
  );
}
