import { afterEach, describe, expect, it, vi } from 'vitest';
import { normalizeEndpoint } from './publicKeyTransactions';
import { subscribePublicKeyTransactions } from './realtimeTransactions';
import { transactionsToDslSource } from './transactionDsl';
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

  serverClose(init: CloseEventInit = {}) {
    this.readyState = FakeWebSocket.CLOSED;
    const event = new Event('close') as CloseEvent;
    Object.defineProperties(event, {
      code: { value: init.code ?? 1006 },
      reason: { value: init.reason ?? '' },
      wasClean: { value: init.wasClean ?? false },
    });
    this.dispatchEvent(event);
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

describe('normalizeEndpoint', () => {
  it('preserves WebSocket endpoints', () => {
    expect(normalizeEndpoint('wss://example.test/path')).toBe('wss://example.test/path');
    expect(normalizeEndpoint('ws://example.test/path')).toBe('ws://example.test/path');
  });

  it('converts HTTP endpoints to WebSocket endpoints', () => {
    expect(normalizeEndpoint('https://example.test/path')).toBe('wss://example.test/path');
    expect(normalizeEndpoint('http://example.test/path')).toBe('ws://example.test/path');
  });

  it('treats endpoints without a protocol as secure WebSocket endpoints', () => {
    expect(normalizeEndpoint('example.test/path')).toBe('wss://example.test/path');
  });
});

describe('subscribePublicKeyTransactions', () => {
  afterEach(() => {
    globalThis.WebSocket = RealWebSocket;
    FakeWebSocket.instances = [];
    vi.useRealTimers();
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

  it('emits outgoing matching push transactions in received serial order only', () => {
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

    expect(onTransaction).toHaveBeenCalledTimes(1);
    expect(onTransaction.mock.calls.map(([transaction]) => transaction.memo)).toEqual(['outgoing']);
  });

  it('preserves parsing diagnostics for invalid secondary push destinations while normalizing valid ones', () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const received: DslTransaction[] = [];

    subscribePublicKeyTransactions({
      endpoint: 'wss://example.test:8831',
      publicKey: 'secondary-key',
      onTransaction: (transaction) => received.push(transaction),
    });

    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({
      type: 'push_transaction',
      body: {
        transaction: {
          time: 1,
          from: 'secondary-key',
          to: '+2+4/+6+6/+4+300000000000000000000000000000000=',
          amount: 1,
          fee: 0,
          memo: 'geometry: box',
        },
      },
    });
    socket.message({
      type: 'push_transaction',
      body: {
        transaction: {
          time: 2,
          from: 'secondary-key',
          to: '+2+4/+6+6/not-a-coordinate',
          amount: 1,
          fee: 0,
          memo: 'geometry: sphere',
        },
      },
    });

    const validResult = transactionsToDslSource([received[0]], { publicKey: 'secondary-key' });
    const invalidResult = transactionsToDslSource([received[1]], { publicKey: 'secondary-key' });

    expect(validResult.source).toBe('"+2+4/+6+6/+4+3" : "geometry: box"');
    expect(validResult.rejected).toEqual([]);
    expect(invalidResult.source).toBe('');
    expect(invalidResult.rejected).toHaveLength(1);
    expect(invalidResult.rejected[0]).toMatchObject({
      memoPreview: '+2+4/+6+6/not-a-coordinate: geometry: sphere',
    });
    expect(invalidResult.rejected[0]?.reasons).not.toEqual([]);
  });

  it('drains outgoing matching transactions from filter blocks', () => {
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const onTransaction = vi.fn();
    const matchingIncoming: DslTransaction = {
      time: 1,
      to: 'secondary-key',
      amount: 1,
      fee: 0,
      memo: 'incoming',
    };
    const matchingOutgoing: DslTransaction = {
      time: 2,
      from: 'secondary-key',
      to: 'recipient',
      amount: 2,
      fee: 0,
      memo: 'first outgoing',
    };
    const anotherMatchingOutgoing: DslTransaction = {
      time: 3,
      from: 'secondary-key',
      to: 'another recipient',
      amount: 3,
      fee: 0,
      memo: 'second outgoing',
    };

    subscribePublicKeyTransactions({
      endpoint: 'wss://example.test:8831',
      publicKey: 'secondary-key',
      onTransaction,
    });

    const socket = FakeWebSocket.instances[0];
    socket.open();
    socket.message({
      type: 'filter_block',
      body: { transactions: [matchingIncoming, matchingOutgoing, anotherMatchingOutgoing] },
    });

    expect(onTransaction.mock.calls.map(([transaction]) => transaction.memo)).toEqual([
      'first outgoing',
      'second outgoing',
    ]);
  });

  it('reports close details and reconnects after an unexpected close', async () => {
    vi.useFakeTimers();
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    const onError = vi.fn();
    const onClose = vi.fn();

    subscribePublicKeyTransactions({
      endpoint: 'wss://example.test:8831',
      publicKey: 'secondary-key',
      onTransaction: vi.fn(),
      onError,
      onClose,
    });

    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.open();
    firstSocket.serverClose({ code: 1011, reason: 'upstream restart', wasClean: false });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Realtime transaction endpoint closed (code 1011, reason: upstream restart, unclean close). Reconnecting...',
    }));

    await vi.advanceTimersByTimeAsync(1_000);

    expect(FakeWebSocket.instances).toHaveLength(2);
    const secondSocket = FakeWebSocket.instances[1];
    secondSocket.open();

    expect(secondSocket.url).toBe('wss://example.test:8831');
    expect(secondSocket.protocols).toEqual(['cruzbit.1']);
    expect(secondSocket.sent).toEqual([
      JSON.stringify({
        type: 'filter_add',
        body: { public_keys: ['secondary-key'] },
      }),
    ]);
  });

  it('backs off when connections open and then immediately close repeatedly', async () => {
    vi.useFakeTimers();
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

    subscribePublicKeyTransactions({
      endpoint: 'wss://example.test:8831',
      publicKey: 'secondary-key',
      onTransaction: vi.fn(),
      onError: vi.fn(),
    });

    const firstSocket = FakeWebSocket.instances[0];
    firstSocket.open();
    firstSocket.serverClose({ code: 1011 });

    await vi.advanceTimersByTimeAsync(1_000);

    expect(FakeWebSocket.instances).toHaveLength(2);
    const secondSocket = FakeWebSocket.instances[1];
    secondSocket.open();
    secondSocket.serverClose({ code: 1011 });

    await vi.advanceTimersByTimeAsync(1_999);

    expect(FakeWebSocket.instances).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(1);

    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('does not reconnect after an explicit subscription close', async () => {
    vi.useFakeTimers();
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;

    const subscription = subscribePublicKeyTransactions({
      endpoint: 'example.test:8831',
      publicKey: 'secondary-key',
      onTransaction: vi.fn(),
      onError: vi.fn(),
    });

    const socket = FakeWebSocket.instances[0];
    socket.open();
    subscription.close();
    socket.serverClose();

    await vi.advanceTimersByTimeAsync(30_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
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
    socket.serverClose();

    expect(socket.closed).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });
});
