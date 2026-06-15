import { useTransactions } from '../transactions/TransactionContext';

export function PublicKeyNavigator() {
  const {
    endpoint,
    selectedPublicKey,
    transactionRange,
    transactions,
    loading,
    error,
    setEndpoint,
    setSelectedPublicKey,
    setTransactionRange,
    reloadTransactions,
  } = useTransactions();

  return (
    <section className="public-key-navigator" aria-label="Transaction loader">
      <div className="section-heading-row">
        <h2>Transaction context</h2>
        <button type="button" onClick={reloadTransactions} disabled={loading || !selectedPublicKey.trim()}>
          {loading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      <label>
        <span>Endpoint</span>
        <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="ws://localhost:8831" />
      </label>

      <label>
        <span>Public key</span>
        <input value={selectedPublicKey} onChange={(event) => setSelectedPublicKey(event.target.value)} placeholder="Paste public key or path" />
      </label>

      <div className="transaction-range-fields">
        <label>
          <span>Start</span>
          <input
            type="number"
            min="0"
            value={transactionRange.startHeight}
            onChange={(event) => setTransactionRange({ ...transactionRange, startHeight: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="number"
            min="0"
            value={transactionRange.endHeight}
            onChange={(event) => setTransactionRange({ ...transactionRange, endHeight: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>Limit</span>
          <input
            type="number"
            min="1"
            value={transactionRange.limit}
            onChange={(event) => setTransactionRange({ ...transactionRange, limit: Number(event.target.value) })}
          />
        </label>
      </div>

      <p className="transaction-status">
        {error ? `Transaction loading failed: ${error}` : `${transactions.length} transaction${transactions.length === 1 ? '' : 's'} loaded.`}
      </p>
    </section>
  );
}
