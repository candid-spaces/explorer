import { parseDslDeclaration, parseDslDocument } from '../dsl/parser';
import type { DslBoxSpec } from '../dsl/types';
import type { DslTransaction, SecondaryAnimationEvent, SecondarySceneReplayCursor, Vector3Tuple } from './types';
import { trimTransactionMemoFiller, trimTransactionPathFiller } from './transactionDsl';

const VECTOR_KEYS = new Set(['position', 'size', 'rotation']);

function fallbackTransactionId(transaction: DslTransaction, index: number): string {
  return [transaction.time, trimTransactionPathFiller(transaction.to), transaction.series ?? 'none', transaction.nonce ?? 'none', index].join(':');
}

function parseVector3(value: string): Vector3Tuple | undefined {
  const parts = value.split(/[,\s]+/).map((part) => part.trim()).filter(Boolean);

  if (parts.length !== 3) {
    return undefined;
  }

  const numbers = parts.map(Number);

  return numbers.every(Number.isFinite) ? numbers as Vector3Tuple : undefined;
}

function parseProperties(memo: string): Map<string, string> {
  const properties = new Map<string, string>();

  memo.split(';').forEach((entry) => {
    const separator = entry.indexOf(':');

    if (separator < 0) {
      return;
    }

    const key = entry.slice(0, separator).trim().toLowerCase();
    const value = entry.slice(separator + 1).trim();

    if (key) {
      properties.set(key, value);
    }
  });

  return properties;
}

function eventFromTransaction(transaction: DslTransaction, index: number): SecondaryAnimationEvent | undefined {
  const targetPath = trimTransactionPathFiller(transaction.to ?? '');
  const properties = parseProperties(trimTransactionMemoFiller(transaction.memo ?? ''));

  if (!targetPath || ![...VECTOR_KEYS].some((key) => properties.has(key))) {
    return undefined;
  }

  const position = properties.has('position') ? parseVector3(properties.get('position')!) : undefined;
  const size = properties.has('size') ? parseVector3(properties.get('size')!) : undefined;
  const rotation = properties.has('rotation') ? parseVector3(properties.get('rotation')!) : undefined;

  if (
    (properties.has('position') && !position) ||
    (properties.has('size') && !size) ||
    (properties.has('rotation') && !rotation) ||
    (!position && !size && !rotation)
  ) {
    return undefined;
  }

  return {
    kind: 'secondary-animation',
    targetPath,
    targetObjectId: targetPath,
    position,
    size,
    rotation,
    timestamp: transaction.time,
    sourceTransactionId: fallbackTransactionId(transaction, index),
    transactionIndex: index,
  };
}

export function secondaryTransactionsToAnimationEvents(
  transactions: readonly DslTransaction[],
): SecondaryAnimationEvent[] {
  return transactions
    .map(eventFromTransaction)
    .filter((event): event is SecondaryAnimationEvent => event !== undefined)
    .sort((a, b) => (a.timestamp - b.timestamp) || (a.transactionIndex - b.transactionIndex));
}

function includesEvent(cursor: SecondarySceneReplayCursor | undefined, event: SecondaryAnimationEvent): boolean {
  if (!cursor) {
    return true;
  }

  if (cursor.timestamp !== undefined && event.timestamp > cursor.timestamp) {
    return false;
  }

  if (cursor.transactionIndex !== undefined && event.transactionIndex > cursor.transactionIndex) {
    return false;
  }

  return true;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value) && value >= 0) {
    return String(value);
  }

  const centiunits = Math.round(value * 100);

  if (centiunits < 0) {
    return '0';
  }

  return centiunits % 100 === 0 ? String(centiunits / 100) : `${centiunits}c`;
}

function formatBox(box: DslBoxSpec, event: SecondaryAnimationEvent): string {
  const size = event.size ?? [box.width, box.height, box.depth];
  const position = event.position ?? [box.x + box.width / 2, box.y + box.height / 2, box.z + box.depth / 2];
  const offsets = position.map((value, index) => value - size[index] / 2) as Vector3Tuple;

  return offsets.map((offset, index) => `+${formatNumber(offset)}+${formatNumber(size[index])}`).join('/');
}

function replaceProperty(properties: string, key: string, value: string): string {
  const entries = properties.split(';').map((entry) => entry.trim()).filter(Boolean);
  const index = entries.findIndex((entry) => entry.split(':', 1)[0]?.trim().toLowerCase() === key);
  const next = `${key}: ${value}`;

  if (index >= 0) {
    entries[index] = next;
  } else {
    entries.push(next);
  }

  return entries.join('; ');
}

function quoteDeclaration(path: string, properties: string): string {
  return `"${path}" : "${properties.replace(/"/g, '\\"')}"`;
}

export function applySecondaryAnimationEventsToSource(
  primaryDslSource: string,
  events: readonly SecondaryAnimationEvent[],
  cursor?: SecondarySceneReplayCursor,
): string {
  const lines = primaryDslSource.split('\n');
  const targetLineIndexes = new Map<string, number>();

  lines.forEach((line, lineIndex) => {
    const parsed = parseDslDeclaration(line);

    if (parsed.ok && parsed.value?.box && !parsed.value.declarationOnly && !targetLineIndexes.has(parsed.value.path.canonicalPath)) {
      targetLineIndexes.set(parsed.value.path.canonicalPath, lineIndex);
    }
  });

  events.filter((event) => includesEvent(cursor, event)).forEach((event) => {
    const lineIndex = targetLineIndexes.get(event.targetPath);

    if (lineIndex === undefined) {
      return;
    }

    const parsed = parseDslDeclaration(lines[lineIndex]);
    const object = parsed.value;

    if (!parsed.ok || !object?.box) {
      return;
    }

    const nextPath = event.position || event.size ? formatBox(object.box, event) : object.path.source;
    const match = lines[lineIndex].match(/^\s*"[^"]+"\s*:\s*"(?<properties>[^"]*)"\s*$/);
    let properties = match?.groups?.properties ?? '';

    if (event.rotation) {
      properties = replaceProperty(properties, 'rotation', event.rotation.join(', '));
    }

    lines[lineIndex] = quoteDeclaration(nextPath, properties);
  });

  return lines.join('\n');
}

export function applySecondaryTransactionsToSceneSource(
  primaryDslSource: string,
  transactions: readonly DslTransaction[],
  cursor?: SecondarySceneReplayCursor,
): string {
  const primaryPaths = new Set((parseDslDocument(primaryDslSource).value ?? [])
    .filter((object) => !object.declarationOnly)
    .map((object) => object.path.canonicalPath));
  const events = secondaryTransactionsToAnimationEvents(transactions)
    .filter((event) => primaryPaths.has(event.targetPath));

  return applySecondaryAnimationEventsToSource(primaryDslSource, events, cursor);
}
