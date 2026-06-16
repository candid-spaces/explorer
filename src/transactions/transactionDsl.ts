import { parseDslDocument } from '../dsl/parser';
import type { ParseDiagnostic } from '../dsl/types';
import type { DslTransaction, RejectedTransaction } from './types';

const TRAILING_FILLER_PATTERN = /\/[0=]+$/;
const QUOTED_PATH_FILLER_PATTERN = /("[^"]*?)\/[0=]+("\s*:)/g;
const MAX_MEMO_PREVIEW_LENGTH = 120;

interface CandidateDsl {
  source: string;
  preview: string;
}

function transactionFallbackId(transaction: DslTransaction, index: number): string {
  return [transaction.time, trimTransactionPathFiller(transaction.to), transaction.series ?? 'none', index].join(':');
}

function previewMemo(memo: string): string {
  const compact = memo.replace(/\s+/g, ' ').trim();
  return compact.length > MAX_MEMO_PREVIEW_LENGTH
    ? `${compact.slice(0, MAX_MEMO_PREVIEW_LENGTH - 1)}…`
    : compact;
}

function trimTrailingFillerFromLine(line: string): string {
  const trimmedRight = line.trimEnd();

  if (TRAILING_FILLER_PATTERN.test(trimmedRight)) {
    return trimmedRight.replace(TRAILING_FILLER_PATTERN, '');
  }

  return trimmedRight.replace(QUOTED_PATH_FILLER_PATTERN, '$1$2');
}

export function trimTransactionPathFiller(path: string): string {
  return path.trim().replace(TRAILING_FILLER_PATTERN, '');
}

export function trimTransactionMemoFiller(memo: string): string {
  return memo
    .split('\n')
    .map(trimTrailingFillerFromLine)
    .join('\n')
    .trim();
}

function diagnosticsToReasons(diagnostics: readonly ParseDiagnostic[]): string[] {
  return diagnostics.map((diagnostic) => `Line ${diagnostic.line}: ${diagnostic.message}`);
}

function quoteDslDeclaration(path: string, properties: string): string {
  return `"${path}" : "${properties.replace(/"/g, '\\"')}"`;
}

function transactionCandidates(transaction: DslTransaction): CandidateDsl[] {
  const memo = trimTransactionMemoFiller(transaction.memo ?? '');
  const path = trimTransactionPathFiller(transaction.to ?? '');
  const candidates: CandidateDsl[] = [];

  if (memo) {
    candidates.push({ source: memo, preview: memo });
  }

  if (path) {
    candidates.push({
      source: quoteDslDeclaration(path, memo),
      preview: `${path}: ${memo}`,
    });
  }

  return candidates;
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

export function transactionsToDslSource(transactions: readonly DslTransaction[]): {
  source: string;
  rejected: RejectedTransaction[];
} {
  const accepted: string[] = [];
  const rejected: RejectedTransaction[] = [];

  transactions.forEach((transaction, index) => {
    const candidates = transactionCandidates(transaction);
    const id = transactionFallbackId(transaction, index);
    const rejectionReasons: string[] = [];

    for (const candidate of candidates) {
      const { parsed, valid } = parseValidDsl(candidate.source);

      if (valid) {
        accepted.push(candidate.source);
        return;
      }

      rejectionReasons.push(...diagnosticsToReasons(parsed.diagnostics));
    }

    if (candidates.length === 0) {
      return;
    }

    rejected.push({
      id,
      memoPreview: previewMemo(candidates[candidates.length - 1].preview),
      reasons: rejectionReasons.length > 0
        ? Array.from(new Set(rejectionReasons))
        : ['Memo did not contain valid DSL coordinates, namespaces, or declarations.'],
    });
  });

  return {
    source: accepted.join('\n'),
    rejected,
  };
}
