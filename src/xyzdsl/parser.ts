import type { AxisName, XyzDslAxisSpec, XyzDslBoxSpec, ParseDiagnostic, ParseResult, SpatialObject } from './types';
import { parseObjectProperties } from './objectDeclarationParser';
import { canonicalNamespacePath, parseXyzDslPath, parsePathAxisSpec, parsePathBoxSpec, parsePathNumber } from './pathParser';

const DECLARATION_PATTERN = /^\s*"(?<box>[^"]+)"\s*:\s*"(?<properties>[^"]*)"\s*$/;

function namespaceReplacementKey(object: SpatialObject): string {
  const declarationKind = object.declarationOnly ? 'declaration' : 'positioned';
  return `${declarationKind}:${canonicalNamespacePath(object.namespace)}`;
}

export function parseCompactNumber(raw: string): number {
  return parsePathNumber(raw);
}

export function parseAxisSpec(raw: string, axis: AxisName): XyzDslAxisSpec {
  return parsePathAxisSpec(raw, axis);
}

export function parseBoxSpec(source: string): XyzDslBoxSpec {
  return parsePathBoxSpec(source);
}

export function parseXyzDslDeclaration(line: string, lineNumber = 1): ParseResult<SpatialObject> {
  const match = line.match(DECLARATION_PATTERN);
  const diagnostics: ParseDiagnostic[] = [];

  if (!match?.groups) {
    return {
      ok: false,
      diagnostics: [
        {
          line: lineNumber,
          source: line,
          message: 'Declaration must look like "+2+4/+0+6/+1+3" : "geometry: box; color: blue; metalness: 0.1".',
        },
      ],
    };
  }

  try {
    const path = parseXyzDslPath(match.groups.box);
    const properties = parseObjectProperties(match.groups.properties);

    return {
      ok: true,
      value: {
        id: path.namespace.length > 0 ? path.canonicalPath : `node-${lineNumber}`,
        source: line,
        path,
        namespace: path.namespace,
        box: path.box,
        material: properties.material,
        geometry: properties.geometry,
        transform: properties.transform,
        reference: properties.reference,
        content: properties.content,
        declarationOnly: path.isDeclarationOnly,
        lineNumber,
      },
      diagnostics: properties.diagnostics.map((message) => ({ line: lineNumber, source: line, message })),
    };
  } catch (error) {
    diagnostics.push({
      line: lineNumber,
      source: line,
      message: error instanceof Error ? error.message : 'Unknown parse error.',
    });

    return { ok: false, diagnostics };
  }
}

export function parseXyzDslDocument(source: string): ParseResult<SpatialObject[]> {
  const objects: SpatialObject[] = [];
  const diagnostics: ParseDiagnostic[] = [];

  source
    .split('\n')
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => line.trim().length > 0)
    .forEach(({ line, lineNumber }) => {
      const result = parseXyzDslDeclaration(line, lineNumber);

      diagnostics.push(...result.diagnostics);

      if (result.ok && result.value) {
        objects.push({ ...result.value, id: result.value.namespace.length > 0 ? result.value.id : `node-${objects.length + 1}` });
      }
    });

  const newestObjectByNamespaceAndKind = new Map<string, SpatialObject>();

  objects.forEach((object) => {
    if (object.namespace.length > 0) {
      newestObjectByNamespaceAndKind.set(namespaceReplacementKey(object), object);
    }
  });

  const currentObjects = objects.filter((object) => {
    if (object.namespace.length === 0) {
      return true;
    }

    return newestObjectByNamespaceAndKind.get(namespaceReplacementKey(object)) === object;
  });

  return {
    ok: diagnostics.length === 0,
    value: currentObjects,
    diagnostics,
  };
}
