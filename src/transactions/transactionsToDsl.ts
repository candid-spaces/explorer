import { canonicalNamespacePath } from '../dsl/pathParser';
import type { DslTransaction, TransactionDslBundle, TransactionMetadata } from './types';

const CRUZBIT_PUBLIC_KEY_LENGTH = 44;
const SAFE_SEGMENT_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;

function stripPaddedPublicKeySegment(segment: string): string {
  if (segment.length < CRUZBIT_PUBLIC_KEY_LENGTH) {
    return segment;
  }

  return segment.replace(/[0=]+$/u, '');
}

function toDslNamespaceSegment(segment: string, fallback: string): string {
  const stripped = stripPaddedPublicKeySegment(segment.trim());
  const normalized = stripped
    .replace(/[^A-Za-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  const withLeadingLetter = /^[A-Za-z]/u.test(normalized) ? normalized : `${fallback}${normalized}`;

  return SAFE_SEGMENT_PATTERN.test(withLeadingLetter) ? withLeadingLetter : fallback;
}

export function namespaceFromTransactionPath(path: string, fallbackIndex: number): string[] {
  const trimmed = path.trim();
  const rawSegments = trimmed.includes('/') ? trimmed.split('/').filter(Boolean) : [trimmed];
  const segments = rawSegments
    .map((segment, index) => toDslNamespaceSegment(segment, `Tx${fallbackIndex + 1}_${index + 1}`))
    .filter(Boolean);

  return segments.length > 0 ? segments : [`Tx${fallbackIndex + 1}`];
}

function declarationLine(namespace: string[], color: string): string {
  return `"${canonicalNamespacePath(namespace)}" : "color: ${color}; roughness: 0.8"`;
}

function concreteLine(namespace: string[], index: number, amount?: number): string {
  const column = index % 10;
  const row = Math.floor(index / 10);
  const size = Math.max(1, Math.min(5, amount ? Math.ceil(Math.log10(Math.abs(amount) + 1)) : 1));
  const x = column * 2;
  const z = row * 2;

  return `"${namespace.join('/')}/+${x}+${size}/+0+${size}/+${z}+${size}" : "geometry: box; color: #60a5fa; metalness: 0.1; roughness: 0.45"`;
}

export function transactionsToDsl(
  transactions: DslTransaction[],
  publicKey: string,
): TransactionDslBundle {
  const lines: string[] = [];
  const metadataByNamespace: Record<string, TransactionMetadata> = {};
  const declared = new Set<string>();

  transactions.forEach((transaction, transactionIndex) => {
    const namespace = namespaceFromTransactionPath(transaction.to, transactionIndex);

    namespace.forEach((_, segmentIndex) => {
      const partial = namespace.slice(0, segmentIndex + 1);
      const path = canonicalNamespacePath(partial);

      if (!declared.has(path)) {
        lines.push(declarationLine(partial, segmentIndex === namespace.length - 1 ? '#38bdf8' : '#1d4ed8'));
        declared.add(path);
      }
    });

    const namespacePath = canonicalNamespacePath(namespace);
    lines.push(concreteLine(namespace, transactionIndex, transaction.amount));
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
