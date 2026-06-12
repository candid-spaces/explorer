import {
  DataTexture,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  type MeshPhysicalMaterialParameters,
} from 'three';
import type { DslMaterialSpec, DslTextureChannel, DslTextureSpec } from '../dsl/types';

const TEXTURE_SIZE = 64;
const TEXTURE_STRENGTH_MAX = 5;
const proceduralTextureCache = new Map<string, Texture>();
const imageTextureCache = new Map<string, Texture>();

const MATERIAL_PARAMETER_BY_CHANNEL: Record<DslTextureChannel, keyof MeshPhysicalMaterialParameters> = {
  map: 'map',
  roughnessMap: 'roughnessMap',
  normalMap: 'normalMap',
  bumpMap: 'bumpMap',
  metalnessMap: 'metalnessMap',
  alphaMap: 'alphaMap',
};

function normalizedTextureStrength(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  return Math.min(Math.max(value, 0), TEXTURE_STRENGTH_MAX) / TEXTURE_STRENGTH_MAX;
}

function strengthLevel(value: number | undefined): number {
  return Math.round(normalizedTextureStrength(value) * TEXTURE_STRENGTH_MAX);
}

function textureTransformKey(spec: DslTextureSpec): string {
  return [
    spec.repeat?.join('x') ?? 'repeat-default',
    spec.offset?.join('x') ?? 'offset-default',
    spec.rotation ?? 'rotation-default',
  ].join(':');
}

function applyTextureTransform(texture: Texture, spec: DslTextureSpec, defaultRepeat: [number, number]): Texture {
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(...(spec.repeat ?? defaultRepeat));

  if (spec.offset) {
    texture.offset.set(...spec.offset);
  }

  if (spec.rotation !== undefined) {
    texture.rotation = spec.rotation;
  }

  texture.needsUpdate = true;

  return texture;
}

function createDataTexture(
  key: string,
  spec: DslTextureSpec,
  defaultRepeat: [number, number],
  pixel: (x: number, y: number) => [number, number, number, number] | number,
): Texture {
  const cacheKey = `${key}:${textureTransformKey(spec)}`;
  const cached = proceduralTextureCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const offset = (y * TEXTURE_SIZE + x) * 4;
      const pixelValue = pixel(x, y);
      const rgba = Array.isArray(pixelValue) ? pixelValue : [pixelValue, pixelValue, pixelValue, 255];

      data[offset] = Math.min(Math.max(Math.round(rgba[0]), 0), 255);
      data[offset + 1] = Math.min(Math.max(Math.round(rgba[1]), 0), 255);
      data[offset + 2] = Math.min(Math.max(Math.round(rgba[2]), 0), 255);
      data[offset + 3] = Math.min(Math.max(Math.round(rgba[3]), 0), 255);
    }
  }

  const texture = new DataTexture(data, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat);
  applyTextureTransform(texture, spec, defaultRepeat);
  proceduralTextureCache.set(cacheKey, texture);

  return texture;
}

function fabricTexture(spec: DslTextureSpec): Texture | undefined {
  const strength = normalizedTextureStrength(spec.strength);

  if (strength <= 0) {
    return undefined;
  }

  return createDataTexture(`fabric.weave:${strengthLevel(spec.strength)}`, spec, [6, 6], (x, y) => {
    const warp = x % 8 < 4 ? 1 : -1;
    const weft = y % 8 < 4 ? 1 : -1;
    const thread = x % 4 === 0 || y % 4 === 0 ? 20 : 0;
    const woven = warp * weft * 18 * strength;

    return 128 + woven + thread * strength;
  });
}

function bumpTexture(spec: DslTextureSpec): Texture | undefined {
  const strength = normalizedTextureStrength(spec.strength);

  if (strength <= 0) {
    return undefined;
  }

  return createDataTexture(`bump.noise:${strengthLevel(spec.strength)}`, spec, [6, 6], (x, y) => {
    const wave = Math.sin((x / TEXTURE_SIZE) * Math.PI * 16) + Math.cos((y / TEXTURE_SIZE) * Math.PI * 14);
    const weave = (x % 6 === 0 ? 1 : 0) + (y % 6 === 0 ? 1 : 0);
    const deterministicNoise = ((x * 37 + y * 17 + x * y * 3) % 29) - 14;

    return 128 + wave * 18 * strength + weave * 20 * strength + deterministicNoise * strength;
  });
}

function woodTexture(spec: DslTextureSpec): Texture | undefined {
  const strength = Math.max(normalizedTextureStrength(spec.strength), 0.35);

  return createDataTexture(`wood.oak:${strengthLevel(spec.strength)}`, spec, [2, 1], (x, y) => {
    const rings = Math.sin((x / TEXTURE_SIZE) * Math.PI * 10 + Math.sin((y / TEXTURE_SIZE) * Math.PI * 4) * 1.6);
    const grain = ((x * 11 + y * 7 + x * y) % 19) - 9;
    const base = 138 + rings * 26 * strength + grain * strength;

    return [base + 38, base * 0.72, base * 0.38, 255];
  });
}

function brushedMetalTexture(spec: DslTextureSpec): Texture | undefined {
  const strength = Math.max(normalizedTextureStrength(spec.strength), 0.3);

  return createDataTexture(`metal.brushed:${strengthLevel(spec.strength)}`, spec, [8, 1], (x, y) => {
    const line = x % 5 === 0 ? 22 : 0;
    const noise = ((x * 13 + y * 3) % 17) - 8;

    return 150 + line * strength + noise * strength;
  });
}

const PRESET_FACTORIES: Record<string, (spec: DslTextureSpec) => Texture | undefined> = {
  'fabric.weave': fabricTexture,
  'bump.noise': bumpTexture,
  'wood.oak': woodTexture,
  'metal.brushed': brushedMetalTexture,
};

function imageTexture(spec: DslTextureSpec, channel: DslTextureChannel): Texture | undefined {
  if (!spec.src) {
    return undefined;
  }

  const cacheKey = `${spec.src}:${channel}:${textureTransformKey(spec)}`;
  const cached = imageTextureCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const texture = new TextureLoader().load(
    spec.src,
    (loadedTexture) => {
      loadedTexture.needsUpdate = true;
    },
    undefined,
    () => {
      imageTextureCache.delete(cacheKey);
    },
  );

  if (channel === 'map') {
    texture.colorSpace = SRGBColorSpace;
  }

  applyTextureTransform(texture, spec, [1, 1]);
  imageTextureCache.set(cacheKey, texture);

  return texture;
}

function textureForSpec(spec: DslTextureSpec, channel: DslTextureChannel): Texture | undefined {
  if (spec.src) {
    return imageTexture(spec, channel);
  }

  if (!spec.preset) {
    return undefined;
  }

  return PRESET_FACTORIES[spec.preset]?.(spec);
}

export function resolveMaterialTextures(material: DslMaterialSpec): MeshPhysicalMaterialParameters {
  const parameters: MeshPhysicalMaterialParameters = {};

  (Object.entries(material.textures ?? {}) as [DslTextureChannel, DslTextureSpec][]).forEach(([channel, spec]) => {
    const texture = textureForSpec(spec, channel);

    if (!texture) {
      return;
    }

    const materialParameter = MATERIAL_PARAMETER_BY_CHANNEL[channel];
    (parameters as Record<string, Texture>)[materialParameter] = texture;
  });

  return parameters;
}
