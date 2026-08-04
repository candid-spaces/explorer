/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest';
import appSource from './App.tsx?raw';

const resetEffect = appSource.match(/useEffect\(\(\) => \{\n    const publicKey = transactionPublicKey\.trim\(\);([\s\S]*?)\n  \}, \[transactionPublicKey\]\);/)?.[0];

describe('remote editor lifecycle', () => {
  it('clears received transactions and reconnects when the primary key changes', () => {
    expect(resetEffect).toContain('publicKey,');
    expect(resetEffect).toContain('endpoint: DEFAULT_OVERLAY_TRANSACTION_ENDPOINT');
    expect(resetEffect).toContain('transactions: []');
    expect(resetEffect).toContain("realtimeStatus: 'connecting'");
  });

  it('does not reset or resubscribe for baseline or height-range changes', () => {
    expect(resetEffect).not.toContain('remoteBaselineSource');
    expect(resetEffect).not.toContain('transactionRange');
    expect(appSource).toContain('key={transactionPublicKey.trim()}');
  });

  it('does not load remote-editor history, leaving realtime delivery as its only input', () => {
    expect(resetEffect).not.toContain('fetchPublicKeyTransactions');
    expect(resetEffect).not.toContain('AbortController');
    expect(resetEffect).not.toContain('mergeHistoricalStreamTransactions');
    expect(appSource.match(/handleRemoteEditorTransaction[\s\S]*?\n  \}, \[transactionPublicKey\]\);/)?.[0])
      .toContain('mergeStreamTransactions(existing, [normalizeXyzDslTransaction(transaction)])');
  });
});
