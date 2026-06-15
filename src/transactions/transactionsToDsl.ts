import { canonicalNamespacePath, parseDslPath } from '../dsl/pathParser';
import type { DslPathSpec } from '../dsl/types';
import type { DslTransaction, TransactionDslBundle, TransactionMetadata } from './types';

function normalizeTransactionPath(path: string): string {
  return path.trim().replace(/^\/+/, '');
}

export function parseTransactionDslPath(path: string): DslPathSpec | undefined {
  const normalized = normalizeTransactionPath(path);

  if (!normalized) {
    return undefined;
  }

  try {
    const parsed = parseDslPath(normalized);

    if (parsed.isDeclarationOnly || !parsed.box) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

function declarationLine(namespace: string[], color: string): string {
  return `"${canonicalNamespacePath(namespace)}" : "color: ${color}; roughness: 0.8"`;
}

function concreteLine(path: DslPathSpec): string {
  return `"${path.canonicalPath}" : "geometry: box; color: #60a5fa; metalness: 0.1; roughness: 0.45"`;
}

export function transactionsToDsl(
  transactions: DslTransaction[],
  publicKey: string,
): TransactionDslBundle {
  const lines: string[] = [];
  const metadataByNamespace: Record<string, TransactionMetadata> = {};
  const declared = new Set<string>();

  transactions.forEach((transaction, transactionIndex) => {
    const path = parseTransactionDslPath(transaction.to);

    if (!path || path.namespace.length === 0) {
      return;
    }

    path.namespace.forEach((_, segmentIndex) => {
      const partial = path.namespace.slice(0, segmentIndex + 1);
      const namespacePath = canonicalNamespacePath(partial);

      if (!declared.has(namespacePath)) {
        lines.push(declarationLine(partial, segmentIndex === path.namespace.length - 1 ? '#38bdf8' : '#1d4ed8'));
        declared.add(namespacePath);
      }
    });

    const namespacePath = canonicalNamespacePath(path.namespace);
    lines.push(concreteLine(path));
    metadataByNamespace[namespacePath] = {
      publicKey,
      transactionIndex,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.amount,
      fee: transaction.fee,
      memo: transaction.memo,
      time: transaction.time,
      signature: transaction.signature,
    };
  });

  return {
    source: lines.join('\n'),
    metadataByNamespace,
  };
}
