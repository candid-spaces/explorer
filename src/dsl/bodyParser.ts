import type { DslDeclarationBody } from './types';
import { parseMaterialDeclaration } from './materialParser';

const SUPPORTED_DIRECTIVE_KEYS = new Set(['import', 'ref']);
const SUPPORTED_MATERIAL_KEYS = new Set(['color', 'metalness', 'roughness']);

export function parseDeclarationBody(source: string): DslDeclarationBody {
  const materialSource: string[] = [];
  const directives: DslDeclarationBody['directives'] = {};
  const diagnostics: string[] = [];

  source
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const [rawProperty, ...rawValueParts] = declaration.split(':');
      const property = rawProperty?.trim();
      const value = rawValueParts.join(':').trim();

      if (!property || !value) {
        diagnostics.push(`Ignoring malformed declaration "${declaration}".`);
        return;
      }

      if (SUPPORTED_DIRECTIVE_KEYS.has(property)) {
        if (property === 'import') {
          directives.import = value;
        }

        if (property === 'ref') {
          directives.ref = normalizeRefPath(value);
        }

        return;
      }

      if (SUPPORTED_MATERIAL_KEYS.has(property)) {
        materialSource.push(`${property}: ${value}`);
        return;
      }

      diagnostics.push(`Ignoring unsupported declaration property "${property}".`);
    });

  const material = parseMaterialDeclaration(materialSource.join('; '));

  return {
    material,
    directives,
    diagnostics: [...diagnostics, ...material.diagnostics],
  };
}

export function normalizeRefPath(value: string): string {
  return value.trim().replace(/\/+$/, '');
}
