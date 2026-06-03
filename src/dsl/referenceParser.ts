import type { DslReferenceSpec } from './types';
import type { DslPropertyDeclaration } from './propertyParser';
import { canonicalNamespacePath, normalizeNamespacePath } from './pathParser';

export function parseReferenceDeclaration(declarations: DslPropertyDeclaration[]): DslReferenceSpec {
  const declaration = declarations.find(({ property }) => property === 'ref');

  if (!declaration) {
    return { diagnostics: [] };
  }

  const normalized = normalizeNamespacePath(declaration.value);

  if (!normalized) {
    return { diagnostics: ['Reference target cannot be empty.'] };
  }

  return {
    targetPath: canonicalNamespacePath(normalized.split('/')),
    diagnostics: [],
  };
}
