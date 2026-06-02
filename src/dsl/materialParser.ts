import type { DslMaterialSpec } from './types';

const SUPPORTED_MATERIAL_KEYS = new Set(['color', 'metalness', 'roughness']);

export function parseMaterialDeclaration(source: string): DslMaterialSpec {
  const material: DslMaterialSpec = { diagnostics: [] };

  source
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const [rawProperty, ...rawValueParts] = declaration.split(':');
      const property = rawProperty?.trim();
      const value = rawValueParts.join(':').trim();

      if (!property || !value) {
        material.diagnostics.push(`Ignoring malformed material declaration "${declaration}".`);
        return;
      }

      if (!SUPPORTED_MATERIAL_KEYS.has(property)) {
        material.diagnostics.push(`Ignoring unsupported material property "${property}".`);
        return;
      }

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
