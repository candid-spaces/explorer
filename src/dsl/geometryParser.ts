import type { DslGeometryKind, DslGeometrySpec } from './types';
import type { DslPropertyDeclaration } from './propertyParser';

const SUPPORTED_GEOMETRY_KINDS = new Set<DslGeometryKind>(['box', 'cylinder', 'cone', 'sphere']);

function parseRoundedBoxRadius(declaration: DslPropertyDeclaration): { value?: number; diagnostics: string[] } {
  const numericValue = Number(declaration.value);

  if (Number.isNaN(numericValue)) {
    return { diagnostics: ['box-radius must be numeric.'] };
  }

  if (numericValue < 0) {
    return { diagnostics: ['box-radius must be greater than or equal to 0.'] };
  }

  return { value: numericValue, diagnostics: [] };
}

export function parseGeometryDeclaration(declarations: DslPropertyDeclaration[]): DslGeometrySpec {
  const geometry: DslGeometrySpec = { kind: 'box', diagnostics: [] };
  const declaration = declarations.find(({ property }) => property === 'geometry');
  const radiusDeclaration = declarations.find(({ property }) => property === 'box-radius');

  if (declaration) {
    if (!SUPPORTED_GEOMETRY_KINDS.has(declaration.value as DslGeometryKind)) {
      geometry.diagnostics.push(`Unsupported geometry "${declaration.value}". Falling back to box geometry.`);
      geometry.declared = true;
    } else {
      geometry.kind = declaration.value as DslGeometryKind;
      geometry.declared = true;
    }
  }

  if (!radiusDeclaration) {
    return geometry;
  }

  const { value: radius, diagnostics } = parseRoundedBoxRadius(radiusDeclaration);
  geometry.diagnostics.push(...diagnostics);

  if (radius === undefined) {
    return geometry;
  }

  if (geometry.kind !== 'box') {
    geometry.diagnostics.push('box-radius only applies to box geometry.');
    return geometry;
  }

  return { ...geometry, declared: true, 'box-radius': radius };
}
