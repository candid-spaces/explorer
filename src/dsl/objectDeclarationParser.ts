import { parseGeometryDeclaration } from './geometryParser';
import { parseMaterialDeclaration } from './materialParser';
import { parsePropertyDeclarations } from './propertyParser';
import { parseTransformDeclaration } from './transformParser';
import type { DslGeometrySpec, DslMaterialSpec, DslTransformSpec } from './types';

const SUPPORTED_OBJECT_PROPERTIES = new Set(['color', 'metalness', 'roughness', 'geometry', 'rotation', 'rotate']);

export interface DslObjectPropertiesSpec {
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  transform: DslTransformSpec;
  diagnostics: string[];
}

export function parseObjectProperties(source: string): DslObjectPropertiesSpec {
  const { declarations, diagnostics } = parsePropertyDeclarations(source);
  const material = parseMaterialDeclaration(declarations);
  const geometry = parseGeometryDeclaration(declarations);
  const transform = parseTransformDeclaration(declarations);
  const unsupportedDiagnostics = declarations
    .filter(({ property }) => !SUPPORTED_OBJECT_PROPERTIES.has(property))
    .map(({ property }) => `Ignoring unsupported object property "${property}".`);

  return {
    material,
    geometry,
    transform,
    diagnostics: [
      ...diagnostics,
      ...material.diagnostics,
      ...geometry.diagnostics,
      ...transform.diagnostics,
      ...unsupportedDiagnostics,
    ],
  };
}
