import { parseXyzDocument } from '../xyz/parser';
import type { ParseDiagnostic } from '../xyz/types';
import type { XyzTransaction, PrimaryHistoricalBaselineXyz, RejectedTransaction } from './types';

// Remote transaction transport/validation can append either slash-prefixed
// zero/equal filler or a terminal equals marker with optional zero filler on
// the final axis size. This filler must not be stored as part of the renderable spatial
// declaration path. Keep this path-scoped: memo/content values may legitimately
// contain "=" and should not use this cleanup rule.
const TRAILING_FILLER_PATTERN = /\/[0=]+$/;
const TERMINAL_AXIS_SIZE_FILLER_PATTERN = /(?<prefix>\+\d+\+)(?<size>[1-9]\d*?)0*=$/;
const MAX_MEMO_PREVIEW_LENGTH = 120;

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
    to: trimTransactionPathFiller(destination),
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
): PrimaryHistoricalBaselineXyz {
  const accepted: string[] = [];
  const rejected: RejectedTransaction[] = [];
  const publicKey = options.publicKey?.trim();
  transactions.forEach((transaction, index) => {
    if (publicKey && transaction.from !== publicKey) {
      return;
    }

    const memo = trimTransactionMemoFiller(transaction.memo ?? '');
    const path = trimTransactionPathFiller(transaction.to ?? '');
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
  };
}
