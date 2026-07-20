import { MATERIAL_PRESET_ALIASES, resolveSemanticMaterial } from './materialCatalog';
import type { XyzMaterialSpec } from './types';

export type MaterialPresetName = keyof typeof MATERIAL_PRESET_ALIASES;

export const MATERIAL_PRESETS = Object.fromEntries(
  Object.keys(MATERIAL_PRESET_ALIASES).map((name) => {
    const declarations = Object.fromEntries(
      MATERIAL_PRESET_ALIASES[name].split(';').map((part) => {
        const [property, ...rest] = part.split(':');
        return [property.trim(), rest.join(':').trim()];
      }),
    );
    const { material } = resolveSemanticMaterial({
      material: declarations.material,
      variant: declarations.variant,
      grain: declarations.grain,
      pattern: declarations.pattern,
      finish: declarations.finish,
    });

    return [name, material ?? {}];
  }),
) as Record<string, Omit<XyzMaterialSpec, 'diagnostics' | 'materialPreset'>>;

export function materialPresetNames(): string[] {
  return Object.keys(MATERIAL_PRESET_ALIASES);
}

export function materialPresetFor(name: string): Omit<XyzMaterialSpec, 'diagnostics' | 'materialPreset'> | undefined {
  return MATERIAL_PRESETS[name as MaterialPresetName];
}
