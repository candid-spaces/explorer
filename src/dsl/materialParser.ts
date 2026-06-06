import type { DslMaterialSpec } from './types';
import type { DslPropertyDeclaration } from './propertyParser';

const SUPPORTED_MATERIAL_KEYS = new Set(['color', 'metalness', 'roughness', 'fabric', 'sheen', 'clearcoat', 'bump']);
const COMPACT_MATERIAL_STRENGTH_MAX = 5;
const COMPACT_MATERIAL_KEYS = new Set(['fabric', 'sheen', 'clearcoat', 'bump']);

function parseNumericMaterialProperty(property: string, value: string): { value?: number; diagnostic?: string } {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return { diagnostic: `Material property "${property}" must be numeric.` };
  }

  if (COMPACT_MATERIAL_KEYS.has(property) && (numericValue < 0 || numericValue > COMPACT_MATERIAL_STRENGTH_MAX)) {
    return { diagnostic: `Material property "${property}" must be between 0 and ${COMPACT_MATERIAL_STRENGTH_MAX}.` };
  }

  return { value: numericValue };
}

export function parseMaterialDeclaration(declarations: DslPropertyDeclaration[]): DslMaterialSpec {
  const material: DslMaterialSpec = { diagnostics: [] };

  declarations
    .filter(({ property }) => SUPPORTED_MATERIAL_KEYS.has(property))
    .forEach(({ property, value }) => {
      if (property === 'color') {
        material.color = value.startsWith('0x') ? Number(value) : value;
        return;
      }

      const { value: numericValue, diagnostic } = parseNumericMaterialProperty(property, value);

      if (diagnostic) {
        material.diagnostics.push(diagnostic);
        return;
      }

      if (property === 'metalness') {
        material.metalness = numericValue;
        return;
      }

      if (property === 'roughness') {
        material.roughness = numericValue;
        return;
      }

      if (property === 'fabric') {
        material.fabric = numericValue;
        return;
      }

      if (property === 'sheen') {
        material.sheen = numericValue;
        return;
      }

      if (property === 'clearcoat') {
        material.clearcoat = numericValue;
        return;
      }

      if (property === 'bump') {
        material.bump = numericValue;
      }
    });

  return material;
}
