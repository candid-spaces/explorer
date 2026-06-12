import { parseGeometryDeclaration } from './geometryParser';
import { parseMaterialDeclaration, SUPPORTED_MATERIAL_KEYS } from './materialParser';
import { parsePropertyDeclarations } from './propertyParser';
import { parseReferenceDeclaration } from './referenceParser';
import { parseTransformDeclaration } from './transformParser';
import type {
  DslGeometrySpec,
  DslMaterialSpec,
  DslReferenceSpec,
  DslTransformSpec,
} from './types';

const SUPPORTED_OBJECT_PROPERTIES = new Set([
  ...SUPPORTED_MATERIAL_KEYS,
  'geometry',
  'box-radius',
  'puff',
  'rotation',
  'rotate',
  'ref',
  'ref-scale',
]);

export interface DslObjectPropertiesSpec {
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  transform: DslTransformSpec;
  reference: DslReferenceSpec;
  diagnostics: string[];
}

export function parseObjectProperties(source: string): DslObjectPropertiesSpec {
  const { declarations, diagnostics } = parsePropertyDeclarations(source);
  const material = parseMaterialDeclaration(declarations);
  const geometry = parseGeometryDeclaration(declarations);
  const transform = parseTransformDeclaration(declarations);
  const reference = parseReferenceDeclaration(declarations);
  const unsupportedDiagnostics = declarations
    .filter(({ property }) => !SUPPORTED_OBJECT_PROPERTIES.has(property))
    .map(
      ({ property }) => `Ignoring unsupported object property "${property}".`,
    );

  return {
    material,
    geometry,
    transform,
    reference,
    diagnostics: [
      ...diagnostics,
      ...material.diagnostics,
      ...geometry.diagnostics,
      ...transform.diagnostics,
      ...reference.diagnostics,
      ...unsupportedDiagnostics,
    ],
  };
}
