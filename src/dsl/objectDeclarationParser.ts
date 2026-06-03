import { parseGeometryDeclaration } from './geometryParser';
import { parseMaterialDeclaration } from './materialParser';
import { parsePropertyDeclarations } from './propertyParser';
import type { DslGeometrySpec, DslMaterialSpec } from './types';

const SUPPORTED_OBJECT_PROPERTIES = new Set(['color', 'metalness', 'roughness', 'geometry']);

export interface DslObjectPropertiesSpec {
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  diagnostics: string[];
}

export function parseObjectProperties(source: string): DslObjectPropertiesSpec {
  const { declarations, diagnostics } = parsePropertyDeclarations(source);
  const material = parseMaterialDeclaration(declarations);
  const geometry = parseGeometryDeclaration(declarations);
  const unsupportedDiagnostics = declarations
    .filter(({ property }) => !SUPPORTED_OBJECT_PROPERTIES.has(property))
    .map(({ property }) => `Ignoring unsupported object property "${property}".`);

  return {
    material,
    geometry,
    diagnostics: [...diagnostics, ...material.diagnostics, ...geometry.diagnostics, ...unsupportedDiagnostics],
  };
}
