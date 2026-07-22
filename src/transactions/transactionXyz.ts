import { parseXyzDocument } from '../xyz/parser';
import type { ParseDiagnostic } from '../xyz/types';
import type { XyzTransaction, PrimaryHistoricalBaselineXyz, RejectedTransaction, SecondaryKeyReference } from './types';

// Remote transaction transport/validation can append either slash-prefixed
// zero/equal filler or a terminal equals marker with optional zero filler on
// the final axis size. This filler must not be stored as part of the renderable spatial
// declaration path. Keep this path-scoped: memo/content values may legitimately
// contain "=" and should not use this cleanup rule.
const TRAILING_FILLER_PATTERN = /\/[0=]+$/;
const TERMINAL_AXIS_SIZE_FILLER_PATTERN = /(?<prefix>\+\d+\+)(?<size>[1-9]\d*?)0*=$/;
const MAX_MEMO_PREVIEW_LENGTH = 120;
export const DEFAULT_SECONDARY_TRANSACTION_ENDPOINT = 'wss://ungallant-unimpeding-kade.ngrok-free.dev/000000b179a6172473845cbc913598edef179aabb31108324694ca1b12a19e32';

function transactionFallbackId(transaction: XyzTransaction, index: number): string {
  return [transaction.time, trimTransactionPathFiller(transaction.to), transaction.series ?? 'none', index].join(':');
}

function previewMemo(memo: string): string {
  const compact = memo.replace(/\s+/g, ' ').trim();
  return compact.length > MAX_MEMO_PREVIEW_LENGTH
    ? `${compact.slice(0, MAX_MEMO_PREVIEW_LENGTH - 1)}…`
    : compact;
}

export function trimTransactionPathFiller(path: string): string {
  return path
    .trim()
    .replace(TRAILING_FILLER_PATTERN, '')
    .replace(TERMINAL_AXIS_SIZE_FILLER_PATTERN, '$<prefix>$<size>');
}

export function trimTransactionMemoFiller(memo: string): string {
  return memo.trim();
}

export function normalizeXyzTransaction(transaction: XyzTransaction): XyzTransaction {
  const destination = transaction.to ?? '';

  return {
    ...transaction,
    // Base64 public keys can end in text that resembles terminal path filler
    // (for example, "+1+10="). Keep them raw so node discovery can identify
    // secondary-key references before any spatial-path normalization occurs.
    to: secondaryPublicKeyCandidate(destination) ? destination : trimTransactionPathFiller(destination),
  };
}

export function normalizeXyzTransactions(transactions: readonly XyzTransaction[]): XyzTransaction[] {
  return transactions.map(normalizeXyzTransaction);
}

function isPlainHttpUrlMemo(memo: string): boolean {
  try {
    const url = new URL(memo);
    return memo.trim() === memo && (url.protocol === 'http:' || url.protocol === 'https:');
  } catch {
    return false;
  }
}

function encodeXyzContentValue(value: string): string {
  return encodeURIComponent(value);
}

function memoToContentProperties(memo: string): string {
  if (isPlainHttpUrlMemo(memo)) {
    return `content-kind: url; content-url-uri: ${encodeXyzContentValue(memo)}`;
  }

  return `content-kind: text; content-text-uri: ${encodeXyzContentValue(memo)}`;
}

function secondaryPublicKeyCandidate(value: string): string | undefined {
  const trimmed = value.trim();

  const isBase64PublicKey = /^[A-Za-z0-9+/]{43}=$/.test(trimmed);
  const isHexPublicKey = /^[A-Fa-f0-9]{64}$/.test(trimmed);

  return isBase64PublicKey || isHexPublicKey ? trimmed : undefined;
}

function memoWithoutNodeProperty(memo: string): string {
  const nodeIndex = memo.indexOf('node:');

  return (nodeIndex >= 0 ? memo.slice(0, nodeIndex) : memo).trim();
}

function publicKeyFromMemo(memo: string): string | undefined {
  const keyText = memoWithoutNodeProperty(memo)
    .replace(/^public[- ]?key\s*:\s*/i, '')
    .split(/[;\s]+/)
    .find(Boolean);

  return keyText ? secondaryPublicKeyCandidate(keyText) : undefined;
}

function endpointFromNodeMemoProperty(memo: string): string | undefined {
  const nodeIndex = memo.indexOf('node:');

  if (nodeIndex < 0) {
    return undefined;
  }

  const endpoint = memo.slice(nodeIndex + 'node:'.length).trim().split(';')[0]?.trim();

  return endpoint || undefined;
}

function secondaryKeyReferenceFromInvalidDeclaration(
  path: string,
  memo: string,
  transactionId: string,
  rawDestination = path,
): SecondaryKeyReference | undefined {
  const publicKey = secondaryPublicKeyCandidate(rawDestination)
    ?? secondaryPublicKeyCandidate(path)
    ?? publicKeyFromMemo(memo);

  if (!publicKey) {
    return undefined;
  }

  const nodeEndpoint = endpointFromNodeMemoProperty(memo);

  return {
    publicKey,
    endpoint: nodeEndpoint ?? DEFAULT_SECONDARY_TRANSACTION_ENDPOINT,
    endpointSource: nodeEndpoint ? 'node-url-address' : 'default-secondary',
    sourceTransactionId: transactionId,
    memoPreview: previewMemo(`${publicKey}: ${memo}`),
  };
}

function memoToXyzProperties(path: string, memo: string): string {
  if (!memo) {
    return memo;
  }

  const source = quoteXyzDeclaration(path, memo);
  const { valid } = parseValidXyz(source);

  return valid ? memo : memoToContentProperties(memo);
}

function diagnosticsToReasons(diagnostics: readonly ParseDiagnostic[]): string[] {
  return diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`);
}

function quoteXyzDeclaration(path: string, properties: string): string {
  return `"${path}" : "${properties.replace(/"/g, '\\"')}"`;
}

function parseValidXyz(source: string) {
  const parsed = parseXyzDocument(source);
  const objects = parsed.value ?? [];
  const hasInvalidObject = objects.some((object) => !object.declarationOnly && !object.box);

  return {
    parsed,
    valid: parsed.ok && objects.length > 0 && !hasInvalidObject,
  };
}

interface TransactionsToXyzSourceOptions {
  publicKey?: string;
  endpoint?: string;
}

export function transactionsToXyzSource(
  transactions: readonly XyzTransaction[],
  options: TransactionsToXyzSourceOptions = {},
): PrimaryHistoricalBaselineXyz & { secondaryKeys: SecondaryKeyReference[] } {
  const accepted: string[] = [];
  const rejected: RejectedTransaction[] = [];
  const secondaryKeys: SecondaryKeyReference[] = [];
  const publicKey = options.publicKey?.trim();
  transactions.forEach((transaction, index) => {
    if (publicKey && transaction.from !== publicKey) {
      return;
    }

    const memo = trimTransactionMemoFiller(transaction.memo ?? '');
    const rawDestination = transaction.to ?? '';
    const rawDestinationPublicKey = secondaryPublicKeyCandidate(rawDestination);
    // A Base64 public key can end with a path-filler-looking suffix like /0=.
    // Keep that raw destination intact for secondary-key references that carry
    // the distinctive node: endpoint memo property.
    const path = rawDestinationPublicKey && memo.includes('node:')
      ? rawDestinationPublicKey
      : trimTransactionPathFiller(rawDestination);
    const id = transactionFallbackId(transaction, index);

    if (!path) {
      return;
    }

    const properties = memoToXyzProperties(path, memo);
    const source = quoteXyzDeclaration(path, properties);
    const { parsed, valid } = parseValidXyz(source);

    if (valid) {
      accepted.push(source);
      return;
    }

    const secondaryKey = secondaryKeyReferenceFromInvalidDeclaration(
      path,
      memo,
      id,
      rawDestination,
    );

    if (secondaryKey) {
      secondaryKeys.push(secondaryKey);
      return;
    }

    const reasons = diagnosticsToReasons(parsed.diagnostics);
    rejected.push({
      id,
      memoPreview: previewMemo(`${path}: ${memo}`),
      reasons: reasons.length > 0 ? reasons : ['Transaction path and memo did not form valid spatial declaration coordinates, namespaces, or properties.'],
    });
  });

  return {
    source: accepted.join('\n'),
    rejected,
    secondaryKeys,
  };
}
