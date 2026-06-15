import type { DslTransaction, TransactionRange } from './types';

interface PublicKeyTransactionsRequest {
  type: 'get_public_key_transactions';
  body: {
    public_key: string;
    start_height: number;
    end_height: number;
    limit: number;
  };
}

interface TransactionBlock {
  transactions?: DslTransaction[];
}

interface PublicKeyTransactionsResponse {
  type: 'public_key_transactions';
  body?: {
    public_key?: string;
    filter_blocks?: TransactionBlock[];
  };
}

type SocketLike = Pick<WebSocket, 'send' | 'close' | 'readyState'> & {
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent<string>) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
};

export type SocketFactory = (endpoint: string) => SocketLike;

interface PendingRequest {
  resolve: (transactions: DslTransaction[]) => void;
  reject: (error: Error) => void;
}

const SOCKET_OPEN_STATE = 1;

export const DEFAULT_TRANSACTION_RANGE: TransactionRange = {
  startHeight: 0,
  endHeight: 0,
  limit: 100,
};

function requestKey(publicKey: string, range: TransactionRange): string {
  return `${publicKey}:${range.startHeight}:${range.endHeight}:${range.limit}`;
}

function flattenPublicKeyTransactions(message: PublicKeyTransactionsResponse): DslTransaction[] {
  return message.body?.filter_blocks?.flatMap((block) => block.transactions ?? []) ?? [];
}

export class TransactionClient {
  private endpoint?: string;
  private socket?: SocketLike;
  private opening?: Promise<void>;
  private pending = new Map<string, PendingRequest[]>();

  constructor(private readonly createSocket: SocketFactory = (endpoint) => new WebSocket(endpoint)) {}

  connect(endpoint: string): Promise<void> {
    if (this.endpoint === endpoint && this.socket?.readyState === SOCKET_OPEN_STATE) {
      return Promise.resolve();
    }

    if (this.endpoint === endpoint && this.opening) {
      return this.opening;
    }

    this.disconnect();
    this.endpoint = endpoint;
    const socket = this.createSocket(endpoint);
    this.socket = socket;

    this.opening = new Promise((resolve, reject) => {
      socket.onopen = () => {
        this.opening = undefined;
        resolve();
      };

      socket.onerror = () => {
        this.opening = undefined;
        reject(new Error(`Unable to connect to transaction endpoint "${endpoint}".`));
      };

      socket.onclose = () => {
        this.opening = undefined;
      };

      socket.onmessage = (event) => this.handleMessage(event.data);
    });

    return this.opening;
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = undefined;
    this.endpoint = undefined;
    this.opening = undefined;
    this.pending.forEach((requests) => {
      requests.forEach((request) => request.reject(new Error('Transaction client disconnected.')));
    });
    this.pending.clear();
  }

  async requestPublicKeyTransactions(
    endpoint: string,
    publicKey: string,
    range: TransactionRange = DEFAULT_TRANSACTION_RANGE,
  ): Promise<DslTransaction[]> {
    const trimmedPublicKey = publicKey.trim();
    if (!trimmedPublicKey) {
      return [];
    }

    await this.connect(endpoint);

    const socket = this.socket;
    if (!socket || socket.readyState !== SOCKET_OPEN_STATE) {
      throw new Error('Transaction endpoint is not connected.');
    }

    const key = requestKey(trimmedPublicKey, range);
    const promise = new Promise<DslTransaction[]>((resolve, reject) => {
      const requests = this.pending.get(key) ?? [];
      requests.push({ resolve, reject });
      this.pending.set(key, requests);
    });

    const request: PublicKeyTransactionsRequest = {
      type: 'get_public_key_transactions',
      body: {
        public_key: trimmedPublicKey,
        start_height: range.startHeight,
        end_height: range.endHeight,
        limit: range.limit,
      },
    };

    socket.send(JSON.stringify(request));

    return promise;
  }

  private handleMessage(raw: string): void {
    let parsed: PublicKeyTransactionsResponse;

    try {
      parsed = JSON.parse(raw) as PublicKeyTransactionsResponse;
    } catch {
      return;
    }

    if (parsed.type !== 'public_key_transactions' || !parsed.body?.public_key) {
      return;
    }

    const prefix = `${parsed.body.public_key}:`;
    const matches = [...this.pending.entries()].filter(([key]) => key.startsWith(prefix));
    const transactions = flattenPublicKeyTransactions(parsed);

    matches.forEach(([key, requests]) => {
      this.pending.delete(key);
      requests.forEach((request) => request.resolve(transactions));
    });
  }
}
