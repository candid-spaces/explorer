import { DataTexture, RGBAFormat, RepeatWrapping, type Texture } from 'three';

const TEXTURE_SIZE = 64;
const textureCache = new Map<string, Texture>();

function clampCompactStrength(value: number | undefined): number {
  if (value === undefined) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 5) / 5;
}

function createDataTexture(key: string, pixel: (x: number, y: number) => number): Texture {
  const cached = textureCache.get(key);

  if (cached) {
    return cached;
  }

  const data = new Uint8Array(TEXTURE_SIZE * TEXTURE_SIZE * 4);

  for (let y = 0; y < TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < TEXTURE_SIZE; x += 1) {
      const offset = (y * TEXTURE_SIZE + x) * 4;
      const value = Math.min(Math.max(Math.round(pixel(x, y)), 0), 255);

      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, TEXTURE_SIZE, TEXTURE_SIZE, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.needsUpdate = true;
  textureCache.set(key, texture);

  return texture;
}

export function fabricTexturePreset(fabric: number | undefined): Texture | undefined {
  const strength = clampCompactStrength(fabric);

  if (strength <= 0) {
    return undefined;
  }

  const level = Math.round(strength * 5);

  return createDataTexture(`fabric:${level}`, (x, y) => {
    const warp = x % 8 < 4 ? 1 : -1;
    const weft = y % 8 < 4 ? 1 : -1;
    const thread = x % 4 === 0 || y % 4 === 0 ? 20 : 0;
    const woven = warp * weft * 18 * strength;

    return 128 + woven + thread * strength;
  });
}

export function bumpTexturePreset(bump: number | undefined, fabric: number | undefined): Texture | undefined {
  const bumpStrength = clampCompactStrength(bump);
  const fabricStrength = clampCompactStrength(fabric);
  const strength = Math.max(bumpStrength, fabricStrength * 0.65);

  if (strength <= 0) {
    return undefined;
  }

  const level = Math.round(strength * 5);

  return createDataTexture(`bump:${level}`, (x, y) => {
    const wave = Math.sin((x / TEXTURE_SIZE) * Math.PI * 16) + Math.cos((y / TEXTURE_SIZE) * Math.PI * 14);
    const weave = (x % 6 === 0 ? 1 : 0) + (y % 6 === 0 ? 1 : 0);
    const deterministicNoise = ((x * 37 + y * 17 + x * y * 3) % 29) - 14;

    return 128 + wave * 18 * strength + weave * 20 * strength + deterministicNoise * strength;
  });
}
