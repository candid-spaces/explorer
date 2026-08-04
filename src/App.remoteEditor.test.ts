/// <reference types="vite/client" />

import { describe, expect, it } from 'vitest';
import appSource from './App.tsx?raw';

const resetEffect = appSource.match(/useEffect\(\(\) => \{\n    setRemoteEditor\(\{([\s\S]*?)\n  \}, \[remoteEditorPublicKey\]\);/)?.[0];

describe('remote editor lifecycle', () => {
  it('clears received transactions and reconnects when the primary key changes', () => {
    expect(resetEffect).toContain('publicKey: remoteEditorPublicKey');
    expect(resetEffect).toContain('endpoint: DEFAULT_OVERLAY_TRANSACTION_ENDPOINT');
    expect(resetEffect).toContain('transactions: []');
    expect(resetEffect).toContain("realtimeStatus: 'connecting'");
  });

  it('does not reset or resubscribe for baseline or height-range changes', () => {
    expect(resetEffect).not.toContain('remoteBaselineSource');
    expect(resetEffect).not.toContain('transactionRange');
    expect(appSource).toContain('key={remoteEditorPublicKey}');
    expect(appSource).toContain('publicKey={remoteEditorPublicKey}');
  });

  it('uses the trimmed subscription identity as the reset dependency', () => {
    expect(appSource).toContain('const remoteEditorPublicKey = transactionPublicKey.trim();');
    expect(resetEffect).toContain('}, [remoteEditorPublicKey]);');
    expect(resetEffect).not.toContain('}, [transactionPublicKey]);');
  });

  it('does not load remote-editor history, leaving realtime delivery as its only input', () => {
    expect(resetEffect).not.toContain('fetchPublicKeyTransactions');
    expect(resetEffect).not.toContain('AbortController');
    expect(resetEffect).not.toContain('mergeHistoricalStreamTransactions');
    expect(appSource.match(/handleRemoteEditorTransaction[\s\S]*?\n  \}, \[remoteEditorPublicKey\]\);/)?.[0])
      .toContain('mergeStreamTransactions(existing, [normalizeXyzDslTransaction(transaction)])');
  });
});
