import type { DslMaterialSpec } from './types';
import type { DslPropertyDeclaration } from './propertyParser';

const SUPPORTED_MATERIAL_KEYS = new Set(['color', 'metalness', 'roughness']);

export function parseMaterialDeclaration(declarations: DslPropertyDeclaration[]): DslMaterialSpec {
  const material: DslMaterialSpec = { diagnostics: [] };

  declarations
    .filter(({ property }) => SUPPORTED_MATERIAL_KEYS.has(property))
    .forEach(({ property, value }) => {
      if (property === 'color') {
        material.color = value.startsWith('0x') ? Number(value) : value;
        return;
      }

      const numericValue = Number(value);

      if (Number.isNaN(numericValue)) {
        material.diagnostics.push(`Material property "${property}" must be numeric.`);
        return;
      }

      if (property === 'metalness') {
        material.metalness = numericValue;
        return;
      }

      if (property === 'roughness') {
        material.roughness = numericValue;
      }
    });

  return material;
}
