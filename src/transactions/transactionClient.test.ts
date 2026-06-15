import { describe, expect, it } from 'vitest';
import { TransactionClient, type SocketFactory } from './transactionClient';

class FakeSocket {
  static OPEN = 1;
  readyState = FakeSocket.OPEN;
  sent: string[] = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send(message: string) {
    this.sent.push(message);
  }

  close() {
    this.readyState = 3;
  }
}

describe('TransactionClient', () => {
  it('sends public-key transaction requests and flattens matching responses', async () => {
    const socket = new FakeSocket();
    const createSocket: SocketFactory = () => socket as unknown as WebSocket;
    const client = new TransactionClient(createSocket);
    const transactionsPromise = client.requestPublicKeyTransactions('ws://example.test', 'pubkey', {
      startHeight: 1,
      endHeight: 9,
      limit: 2,
    });

    socket.onopen?.(new Event('open'));
    await Promise.resolve();

    expect(JSON.parse(socket.sent[0])).toEqual({
      type: 'get_public_key_transactions',
      body: {
        public_key: 'pubkey',
        start_height: 1,
        end_height: 9,
        limit: 2,
      },
    });

    socket.onmessage?.({
      data: JSON.stringify({
        type: 'public_key_transactions',
        body: {
          public_key: 'pubkey',
          filter_blocks: [{ transactions: [{ to: '/A' }] }, { transactions: [{ to: '/B' }] }],
        },
      }),
    } as MessageEvent<string>);

    await expect(transactionsPromise).resolves.toEqual([{ to: '/A' }, { to: '/B' }]);
  });
});
