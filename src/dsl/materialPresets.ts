import type { DslMaterialSpec } from './types';

export type MaterialPresetName = keyof typeof MATERIAL_PRESETS;

export const MATERIAL_PRESETS = {
  'upholstery.fabric': {
    roughness: 0.88,
    textures: {
      roughnessMap: { preset: 'fabric.weave', repeat: [6, 6], strength: 3 },
      bumpMap: { preset: 'fabric.weave', repeat: [6, 6], strength: 2 },
    },
  },
  'wood.oak': {
    color: '#9a6a3a',
    roughness: 0.62,
    textures: {
      map: { preset: 'wood.oak', repeat: [2, 1], strength: 3 },
      bumpMap: { preset: 'wood.oak', repeat: [2, 1], strength: 1 },
    },
  },
  'metal.brushed': {
    color: '#b8bcc4',
    metalness: 0.82,
    roughness: 0.36,
    textures: {
      roughnessMap: { preset: 'metal.brushed', repeat: [8, 1], strength: 2 },
    },
  },
  'plastic.matte': {
    color: '#64748b',
    metalness: 0,
    roughness: 0.7,
  },
} satisfies Record<string, Omit<DslMaterialSpec, 'diagnostics' | 'materialPreset'>>;

export function materialPresetNames(): string[] {
  return Object.keys(MATERIAL_PRESETS);
}

export function materialPresetFor(name: string): Omit<DslMaterialSpec, 'diagnostics' | 'materialPreset'> | undefined {
  return MATERIAL_PRESETS[name as MaterialPresetName];
}
