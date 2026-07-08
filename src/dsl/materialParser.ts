import { materialPresetFor, materialPresetNames } from './materialPresets';
import { resolveSemanticMaterial } from './materialCatalog';
import type { DslMaterialSpec, DslTextureChannel, DslTextureSpec } from './types';
import type { DslPropertyDeclaration } from './propertyParser';

const CHANNEL_PROPERTY_ALIASES: Record<string, DslTextureChannel> = {
  texture: 'map',
  map: 'map',
  'color-texture': 'map',
  'roughness-texture': 'roughnessMap',
  'normal-texture': 'normalMap',
  'bump-texture': 'bumpMap',
  'metalness-texture': 'metalnessMap',
  'alpha-texture': 'alphaMap',
};

const CHANNEL_SRC_ALIASES: Record<string, DslTextureChannel> = {
  'texture-src': 'map',
  'map-src': 'map',
  'color-texture-src': 'map',
  'roughness-texture-src': 'roughnessMap',
  'normal-texture-src': 'normalMap',
  'bump-texture-src': 'bumpMap',
  'metalness-texture-src': 'metalnessMap',
  'alpha-texture-src': 'alphaMap',
};

const CHANNEL_REPEAT_ALIASES: Record<string, DslTextureChannel | 'all'> = {
  'texture-repeat': 'all',
  'map-repeat': 'map',
  'color-texture-repeat': 'map',
  'roughness-repeat': 'roughnessMap',
  'roughness-texture-repeat': 'roughnessMap',
  'normal-repeat': 'normalMap',
  'normal-texture-repeat': 'normalMap',
  'bump-repeat': 'bumpMap',
  'bump-texture-repeat': 'bumpMap',
  'metalness-repeat': 'metalnessMap',
  'metalness-texture-repeat': 'metalnessMap',
  'alpha-repeat': 'alphaMap',
  'alpha-texture-repeat': 'alphaMap',
};

const CHANNEL_ROTATION_ALIASES: Record<string, DslTextureChannel | 'all'> = {
  'texture-rotation': 'all',
  'map-rotation': 'map',
  'roughness-texture-rotation': 'roughnessMap',
  'normal-texture-rotation': 'normalMap',
  'bump-texture-rotation': 'bumpMap',
  'metalness-texture-rotation': 'metalnessMap',
  'alpha-texture-rotation': 'alphaMap',
};

const CHANNEL_OFFSET_ALIASES: Record<string, DslTextureChannel | 'all'> = {
  'texture-offset': 'all',
  'map-offset': 'map',
  'roughness-texture-offset': 'roughnessMap',
  'normal-texture-offset': 'normalMap',
  'bump-texture-offset': 'bumpMap',
  'metalness-texture-offset': 'metalnessMap',
  'alpha-texture-offset': 'alphaMap',
};

const CHANNEL_STRENGTH_ALIASES: Record<string, DslTextureChannel | 'all'> = {
  'texture-strength': 'all',
  'map-strength': 'map',
  'roughness-texture-strength': 'roughnessMap',
  'normal-texture-strength': 'normalMap',
  'bump-texture-strength': 'bumpMap',
  'metalness-texture-strength': 'metalnessMap',
  'alpha-texture-strength': 'alphaMap',
};

export const SUPPORTED_MATERIAL_KEYS = new Set([
  'material-preset',
  'material',
  'variant',
  'grain',
  'pattern',
  'finish',
  'texture-scale',
  'bump',
  'reflectivity',
  'clearcoat',
  'opacity',
  'transmission',
  'ior',
  'color',
  'metalness',
  'roughness',
  ...Object.keys(CHANNEL_PROPERTY_ALIASES),
  ...Object.keys(CHANNEL_SRC_ALIASES),
  ...Object.keys(CHANNEL_REPEAT_ALIASES),
  ...Object.keys(CHANNEL_STRENGTH_ALIASES),
  ...Object.keys(CHANNEL_ROTATION_ALIASES),
  ...Object.keys(CHANNEL_OFFSET_ALIASES),
]);

function cloneTexture(texture: DslTextureSpec): DslTextureSpec {
  return {
    ...texture,
    ...(texture.repeat ? { repeat: [...texture.repeat] as [number, number] } : {}),
    ...(texture.offset ? { offset: [...texture.offset] as [number, number] } : {}),
  };
}

function cloneTextures(textures: DslMaterialSpec['textures']): DslMaterialSpec['textures'] {
  if (!textures) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(textures).map(([channel, texture]) => [channel, texture ? cloneTexture(texture) : texture]),
  ) as DslMaterialSpec['textures'];
}

function applyMaterialDefaults(material: DslMaterialSpec, defaults: Omit<DslMaterialSpec, 'diagnostics' | 'materialPreset'>): void {
  material.color = defaults.color;
  material.metalness = defaults.metalness;
  material.roughness = defaults.roughness;
  material.reflectivity = defaults.reflectivity;
  material.clearcoat = defaults.clearcoat;
  material.opacity = defaults.opacity;
  material.transmission = defaults.transmission;
  material.ior = defaults.ior;
  material.textures = cloneTextures(defaults.textures);
}

function parseNumericMaterialProperty(property: string, value: string): { value?: number; diagnostic?: string } {
  const numericValue = Number(value);

  if (Number.isNaN(numericValue)) {
    return { diagnostic: `Material property "${property}" must be numeric.` };
  }

  return { value: numericValue };
}

function parseNumberPair(property: string, value: string): { value?: [number, number]; diagnostic?: string } {
  const parts = value.split(/[\s,]+/).filter(Boolean);

  if (parts.length !== 2) {
    return { diagnostic: `Material property "${property}" must be two numeric values.` };
  }

  const numbers = parts.map(Number);

  if (numbers.some(Number.isNaN)) {
    return { diagnostic: `Material property "${property}" must be two numeric values.` };
  }

  return { value: [numbers[0], numbers[1]] };
}

function ensureTexture(material: DslMaterialSpec, channel: DslTextureChannel): DslTextureSpec {
  material.textures = material.textures ?? {};
  material.textures[channel] = material.textures[channel] ?? {};

  return material.textures[channel];
}

function applyToTextureChannels(
  material: DslMaterialSpec,
  channel: DslTextureChannel | 'all',
  apply: (texture: DslTextureSpec) => void,
): void {
  if (channel === 'all') {
    const channels: DslTextureChannel[] = material.textures ? (Object.keys(material.textures) as DslTextureChannel[]) : ['map'];
    channels.forEach((textureChannel) => apply(ensureTexture(material, textureChannel)));
    return;
  }

  apply(ensureTexture(material, channel));
}

function textureValue(value: string): DslTextureSpec {
  if (value.startsWith('src:')) {
    return { src: value.slice('src:'.length).trim() };
  }

  if (value.startsWith('preset:')) {
    return { preset: value.slice('preset:'.length).trim() };
  }

  return { preset: value };
}

export function parseMaterialDeclaration(declarations: DslPropertyDeclaration[]): DslMaterialSpec {
  const material: DslMaterialSpec = { diagnostics: [] };
  const presetDeclaration = declarations.find(({ property }) => property === 'material-preset');
  const semanticMaterial = declarations.find(({ property }) => property === 'material')?.value;
  const materialVariant = declarations.find(({ property }) => property === 'variant')?.value;
  const materialPattern = declarations.find(({ property }) => property === 'pattern')?.value;
  const materialGrain = declarations.find(({ property }) => property === 'grain')?.value;
  const materialFinish = declarations.find(({ property }) => property === 'finish')?.value;

  if (presetDeclaration) {
    const preset = materialPresetFor(presetDeclaration.value);

    if (!preset) {
      material.diagnostics.push(
        `Unsupported material preset "${presetDeclaration.value}". Supported presets: ${materialPresetNames().join(', ')}.`,
      );
    } else {
      material.materialPreset = presetDeclaration.value;
      applyMaterialDefaults(material, preset);
    }
  }

  if (semanticMaterial) {
    const { material: semanticDefaults, diagnostics } = resolveSemanticMaterial({
      material: semanticMaterial,
      variant: materialVariant,
      grain: materialGrain,
      pattern: materialPattern,
      finish: materialFinish,
    });

    material.diagnostics.push(...diagnostics);
    if (semanticDefaults) {
      material.semanticMaterial = semanticMaterial;
      material.materialVariant = materialGrain ?? materialVariant;
      material.materialPattern = materialPattern;
      material.materialFinish = materialFinish;
      applyMaterialDefaults(material, semanticDefaults);
    }
  }

  declarations
    .filter(({ property }) => SUPPORTED_MATERIAL_KEYS.has(property) && property !== 'material-preset')
    .forEach(({ property, value }) => {
      if (['material', 'variant', 'grain', 'pattern', 'finish'].includes(property)) {
        return;
      }

      const textureChannel = CHANNEL_PROPERTY_ALIASES[property];
      if (textureChannel) {
        ensureTexture(material, textureChannel);
        material.textures = {
          ...material.textures,
          [textureChannel]: {
            ...material.textures?.[textureChannel],
            ...textureValue(value),
          },
        };
        return;
      }

      const textureSrcChannel = CHANNEL_SRC_ALIASES[property];
      if (textureSrcChannel) {
        ensureTexture(material, textureSrcChannel).src = value;
        return;
      }

      const repeatChannel = CHANNEL_REPEAT_ALIASES[property];
      if (repeatChannel) {
        const { value: repeat, diagnostic } = parseNumberPair(property, value);

        if (diagnostic) {
          material.diagnostics.push(diagnostic);
          return;
        }

        applyToTextureChannels(material, repeatChannel, (texture) => {
          texture.repeat = repeat;
        });
        return;
      }

      const strengthChannel = CHANNEL_STRENGTH_ALIASES[property];
      if (strengthChannel) {
        const { value: strength, diagnostic } = parseNumericMaterialProperty(property, value);

        if (diagnostic) {
          material.diagnostics.push(diagnostic);
          return;
        }

        applyToTextureChannels(material, strengthChannel, (texture) => {
          texture.strength = strength;
        });
        return;
      }

      const rotationChannel = CHANNEL_ROTATION_ALIASES[property];
      if (rotationChannel) {
        const { value: rotation, diagnostic } = parseNumericMaterialProperty(property, value);

        if (diagnostic) {
          material.diagnostics.push(diagnostic);
          return;
        }

        applyToTextureChannels(material, rotationChannel, (texture) => {
          texture.rotation = rotation;
        });
        return;
      }

      const offsetChannel = CHANNEL_OFFSET_ALIASES[property];
      if (offsetChannel) {
        const { value: offset, diagnostic } = parseNumberPair(property, value);

        if (diagnostic) {
          material.diagnostics.push(diagnostic);
          return;
        }

        applyToTextureChannels(material, offsetChannel, (texture) => {
          texture.offset = offset;
        });
        return;
      }

      if (property === 'texture-scale') {
        const { value: repeat, diagnostic } = parseNumberPair(property, value);

        if (diagnostic) {
          material.diagnostics.push(diagnostic);
          return;
        }

        applyToTextureChannels(material, 'all', (texture) => {
          texture.repeat = repeat;
        });
        return;
      }

      if (property === 'bump') {
        const { value: strength, diagnostic } = parseNumericMaterialProperty(property, value);

        if (diagnostic) {
          material.diagnostics.push(diagnostic);
          return;
        }

        applyToTextureChannels(material, 'bumpMap', (texture) => {
          texture.strength = strength;
        });
        return;
      }

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

      if (property === 'reflectivity') {
        material.reflectivity = numericValue;
        return;
      }

      if (property === 'clearcoat') {
        material.clearcoat = numericValue;
        return;
      }

      if (property === 'opacity') {
        material.opacity = numericValue;
        return;
      }

      if (property === 'transmission') {
        material.transmission = numericValue;
        return;
      }

      if (property === 'ior') {
        material.ior = numericValue;
      }

    });

  return material;
}
