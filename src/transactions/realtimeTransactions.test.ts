import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribePublicKeyTransactions } from './realtimeTransactions';
import type { DslTransaction } from './types';

class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = [];
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  closed = false;

  constructor(public url: string, public protocols?: string | string[]) {
    super();
    FakeWebSocket.instances.push(this);
  }

  send(message: string) {
    this.sent.push(message);
  }

  close() {
    this.closed = true;
    this.readyState = FakeWebSocket.CLOSED;
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  message(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  fail() {
    this.dispatchEvent(new Event('error'));
  }
}

const RealWebSocket = globalThis.WebSocket;

describe('subscribePublicKeyTransactions', () => {
  afterEach(() => {
    globalThis.WebSocket = RealWebSocket;
    FakeWebSocket.instances = [];
    vi.restoreAllMocks();
  });

  it('normalizes endpoints, uses the Cruzbit protocol, and registers a public-key filter', () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

    subscribePublicKeyTransactions({
      endpoint: 'example.test:8831',
      publicKey: 'secondary-key',
      onTransaction: vi.fn(),
    });

    const socket = FakeWebSocket.instances[0];
    socket.open();

    expect(socket.url).toBe('wss://example.test:8831');
    expect(socket.protocols).toEqual(['cruzbit.1']);
    expect(socket.sent).toEqual([
      JSON.stringify({
        type: 'filter_add',
        body: { public_keys: ['secondary-key'] },
      }),
    ]);
  });

  it('emits matching push transactions in received serial order only', () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const onTransaction = vi.fn();
    const matchingIncoming: DslTransaction = {
      time: 1,
      to: 'secondary-key',
      amount: 1,
      fee: 0,
      memo: 'incoming',
    };
    const unrelated: DslTransaction = {
      time: 2,
      to: 'someone-else',
      amount: 2,
      fee: 0,
      memo: 'ignored',
    };
    const matchingOutgoing: DslTransaction = {
      time: 3,
      from: 'secondary-key',
      to: 'recipient',
      amount: 3,
      fee: 0,
      memo: 'outgoing',
    };

    subscribePublicKeyTransactions({
      endpoint: 'wss://example.test:8831',
      publicKey: 'secondary-key',
      onTransaction,
    });

    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({ type: 'push_transaction', body: { transaction: matchingIncoming } });
    socket.message({ type: 'push_transaction', body: { transaction: unrelated } });
    socket.message({ type: 'tip_header', body: {} });
    socket.message({ type: 'push_transaction', body: { transaction: matchingOutgoing } });

    expect(onTransaction).toHaveBeenCalledTimes(2);
    expect(onTransaction.mock.calls.map(([transaction]) => transaction.memo)).toEqual(['incoming', 'outgoing']);
  });

  it('cleans up without reporting errors when aborted', () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const controller = new AbortController();
    const onError = vi.fn();

    subscribePublicKeyTransactions({
      endpoint: 'example.test:8831',
      publicKey: 'secondary-key',
      signal: controller.signal,
      onTransaction: vi.fn(),
      onError,
    });

    const socket = FakeWebSocket.instances[0];
    controller.abort();
    socket.fail();

    expect(socket.closed).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });
});
