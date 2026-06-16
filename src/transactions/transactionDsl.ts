import { parseDslDocument } from '../dsl/parser';
import type { ParseDiagnostic } from '../dsl/types';
import type { DslTransaction, RejectedTransaction } from './types';

const TRAILING_FILLER_PATTERN = /\/[0=]+$/;
const QUOTED_PATH_FILLER_PATTERN = /("[^"]*?)\/[0=]+("\s*:)/g;
const MAX_MEMO_PREVIEW_LENGTH = 120;

function transactionFallbackId(transaction: DslTransaction, index: number): string {
  return [transaction.time, transaction.to, transaction.series ?? 'none', index].join(':');
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

export function transactionsToDslSource(transactions: readonly DslTransaction[]): {
  source: string;
  rejected: RejectedTransaction[];
} {
  const accepted: string[] = [];
  const rejected: RejectedTransaction[] = [];

  transactions.forEach((transaction, index) => {
    const memo = trimTransactionMemoFiller(transaction.memo ?? '');
    const id = transactionFallbackId(transaction, index);

    if (!memo) {
      return;
    }

    const parsed = parseDslDocument(memo);
    const objects = parsed.value ?? [];
    const hasInvalidObject = objects.some((object) => !object.declarationOnly && !object.box);

    if (!parsed.ok || objects.length === 0 || hasInvalidObject) {
      const reasons = diagnosticsToReasons(parsed.diagnostics);
      rejected.push({
        id,
        memoPreview: previewMemo(memo),
        reasons: reasons.length > 0 ? reasons : ['Memo did not contain valid DSL coordinates, namespaces, or declarations.'],
      });
      return;
    }

    accepted.push(memo);
  });

  return {
    source: accepted.join('\n'),
    rejected,
  };
}
