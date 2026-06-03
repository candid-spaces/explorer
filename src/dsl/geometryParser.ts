import type { DslGeometryKind, DslGeometrySpec } from './types';
import type { DslPropertyDeclaration } from './propertyParser';

const SUPPORTED_GEOMETRY_KINDS = new Set<DslGeometryKind>(['box', 'cylinder', 'cone', 'sphere']);

export function parseGeometryDeclaration(declarations: DslPropertyDeclaration[]): DslGeometrySpec {
  const geometry: DslGeometrySpec = { kind: 'box', diagnostics: [] };
  const declaration = declarations.find(({ property }) => property === 'geometry');

  if (!declaration) {
    return geometry;
  }

  if (!SUPPORTED_GEOMETRY_KINDS.has(declaration.value as DslGeometryKind)) {
    geometry.diagnostics.push(`Unsupported geometry "${declaration.value}". Falling back to box geometry.`);
    return { ...geometry, declared: true };
  }

  return { ...geometry, kind: declaration.value as DslGeometryKind, declared: true };
}
