import type { DslMaterialSpec } from '../dsl/types';

export function resolveMaterial(parent: DslMaterialSpec | undefined, material: DslMaterialSpec): DslMaterialSpec {
  return {
    color: material.color ?? parent?.color,
    metalness: material.metalness ?? parent?.metalness,
    roughness: material.roughness ?? parent?.roughness,
    diagnostics: [...(parent?.diagnostics ?? []), ...material.diagnostics],
  };
}
