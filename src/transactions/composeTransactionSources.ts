import { parseDslDeclaration, parseDslDocument } from '../dsl/parser';
import { canonicalNamespacePath } from '../dsl/pathParser';

export type TransactionSourceNamespacePolicy = 'append' | 'namespace-conflicts' | 'always-namespace';

export interface SecondaryTransactionSourceDeclaration {
  source: string;
}

export interface ComposeTransactionSecondaryStream {
  declarations: readonly SecondaryTransactionSourceDeclaration[] | string;
  id?: string;
  playbackCursor?: number;
}

export interface ComposeTransactionSourcesOptions {
  playbackCursor?: number;
  namespacePolicy?: TransactionSourceNamespacePolicy;
}

const DEFAULT_OVERLAY_NAMESPACE_PREFIX = 'Overlay';
const DECLARATION_LINE_PATTERN = /^\s*"(?<path>[^"]+)"\s*:\s*"(?<properties>[^"]*)"\s*$/;

function stableOverlayNamespace(index: number): string {
  return `${DEFAULT_OVERLAY_NAMESPACE_PREFIX}${String(index + 1).padStart(2, '0')}`;
}

function declarationSources(declarations: readonly SecondaryTransactionSourceDeclaration[] | string): string[] {
  if (typeof declarations === 'string') {
    return declarations
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return declarations.map((declaration) => declaration.source.trim()).filter(Boolean);
}

function primaryDeclarationNamespaces(primaryDslSource: string): Set<string> {
  const parsed = parseDslDocument(primaryDslSource);
  const namespaces = new Set<string>();

  (parsed.value ?? []).forEach((object) => {
    if (object.declarationOnly && object.namespace.length > 0) {
      namespaces.add(canonicalNamespacePath(object.namespace));
    }
  });

  return namespaces;
}

function lineNamespacePath(line: string): string | undefined {
  const parsed = parseDslDeclaration(line);

  if (!parsed.ok || !parsed.value?.declarationOnly || parsed.value.namespace.length === 0) {
    return undefined;
  }

  return canonicalNamespacePath(parsed.value.namespace);
}

function shouldNamespaceStream(
  lines: readonly string[],
  primaryNamespaces: ReadonlySet<string>,
  policy: TransactionSourceNamespacePolicy,
): boolean {
  if (policy === 'append') {
    return false;
  }

  if (policy === 'always-namespace') {
    return lines.length > 0;
  }

  return lines.some((line) => {
    const namespace = lineNamespacePath(line);
    return namespace !== undefined && primaryNamespaces.has(namespace);
  });
}

function namespaceDeclarationLine(line: string, namespace: string): string {
  const match = line.match(DECLARATION_LINE_PATTERN);

  if (!match?.groups) {
    return line;
  }

  return `"${namespace}/${match.groups.path}" : "${match.groups.properties}"`;
}

function clampCursor(cursor: number | undefined, lineCount: number): number {
  if (cursor === undefined) {
    return lineCount;
  }

  return Math.min(Math.max(Math.trunc(cursor), 0), lineCount);
}

export function composeTransactionSources(
  primaryDslSource: string,
  secondaryStreams: readonly ComposeTransactionSecondaryStream[],
  options: ComposeTransactionSourcesOptions = {},
): string {
  const primary = primaryDslSource.trim();
  const primaryNamespaces = primaryDeclarationNamespaces(primaryDslSource);
  const composedSecondarySources = secondaryStreams.flatMap((stream, streamIndex) => {
    const lines = declarationSources(stream.declarations);
    const cursor = clampCursor(stream.playbackCursor ?? options.playbackCursor, lines.length);
    const visibleLines = lines.slice(0, cursor);
    const namespace = stableOverlayNamespace(streamIndex);
    const namespaced = shouldNamespaceStream(visibleLines, primaryNamespaces, options.namespacePolicy ?? 'namespace-conflicts');

    return namespaced ? visibleLines.map((line) => namespaceDeclarationLine(line, namespace)) : visibleLines;
  });

  return [primary, composedSecondarySources.join('\n')]
    .filter((source) => source.trim().length > 0)
    .join('\n');
}
