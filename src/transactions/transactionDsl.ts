import { parseDslDocument } from '../dsl/parser';
import type { ParseDiagnostic } from '../dsl/types';
import type { DslTransaction, RejectedTransaction } from './types';

const TRAILING_FILLER_PATTERN = /\/[0=]+$/;
const MAX_MEMO_PREVIEW_LENGTH = 120;

function transactionFallbackId(transaction: DslTransaction, index: number): string {
  return [transaction.time, trimTransactionPathFiller(transaction.to), transaction.series ?? 'none', index].join(':');
}

function previewMemo(memo: string): string {
  const compact = memo.replace(/\s+/g, ' ').trim();
  return compact.length > MAX_MEMO_PREVIEW_LENGTH
    ? `${compact.slice(0, MAX_MEMO_PREVIEW_LENGTH - 1)}…`
    : compact;
}

export function trimTransactionPathFiller(path: string): string {
  return path.trim().replace(TRAILING_FILLER_PATTERN, '');
}

export function trimTransactionMemoFiller(memo: string): string {
  return memo.trim();
}

function isPlainHttpUrlMemo(memo: string): boolean {
  try {
    const url = new URL(memo);
    return memo.trim() === memo && (url.protocol === 'http:' || url.protocol === 'https:');
  } catch {
    return false;
  }
}

function encodeDslContentValue(value: string): string {
  return encodeURIComponent(value);
}

function memoToContentProperties(memo: string): string {
  if (isPlainHttpUrlMemo(memo)) {
    return `content-kind: url; content-url-uri: ${encodeDslContentValue(memo)}`;
  }

  return `content-kind: text; content-text-uri: ${encodeDslContentValue(memo)}`;
}

function memoToDslProperties(path: string, memo: string): string {
  if (!memo) {
    return memo;
  }

  const source = quoteDslDeclaration(path, memo);
  const { valid } = parseValidDsl(source);

  return valid ? memo : memoToContentProperties(memo);
}

function diagnosticsToReasons(diagnostics: readonly ParseDiagnostic[]): string[] {
  return diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`);
}

function quoteDslDeclaration(path: string, properties: string): string {
  return `"${path}" : "${properties.replace(/"/g, '\\"')}"`;
}

function parseValidDsl(source: string) {
  const parsed = parseDslDocument(source);
  const objects = parsed.value ?? [];
  const hasInvalidObject = objects.some((object) => !object.declarationOnly && !object.box);

  return {
    parsed,
    valid: parsed.ok && objects.length > 0 && !hasInvalidObject,
  };
}

interface TransactionsToDslSourceOptions {
  publicKey?: string;
}

export function transactionsToDslSource(
  transactions: readonly DslTransaction[],
  options: TransactionsToDslSourceOptions = {},
): {
  source: string;
  rejected: RejectedTransaction[];
} {
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

    const properties = memoToDslProperties(path, memo);
    const source = quoteDslDeclaration(path, properties);
    const { parsed, valid } = parseValidDsl(source);

    if (valid) {
      accepted.push(source);
      return;
    }

    const reasons = diagnosticsToReasons(parsed.diagnostics);
    rejected.push({
      id,
      memoPreview: previewMemo(`${path}: ${memo}`),
      reasons: reasons.length > 0 ? reasons : ['Transaction path and memo did not form valid DSL coordinates, namespaces, or declarations.'],
    });
  });

  return {
    source: accepted.join('\n'),
    rejected,
  };
}
