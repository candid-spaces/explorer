import type { DslMaterialSpec, DslTextureSpec } from './types';

export type SemanticMaterialFamily = keyof typeof MATERIAL_CATALOG;

type TextureMap = NonNullable<DslMaterialSpec['textures']>;

type MaterialDefaults = Omit<DslMaterialSpec, 'diagnostics' | 'materialPreset'>;

interface CatalogEntry {
  aliases?: string[];
  defaults: MaterialDefaults;
  variants?: Record<string, MaterialDefaults>;
  patterns?: Record<string, MaterialDefaults>;
  finishes?: Record<string, MaterialDefaults>;
  defaultVariant?: string;
  defaultPattern?: string;
  defaultFinish?: string;
}

function texture(preset: string, repeat: [number, number], strength: number): DslTextureSpec {
  return { preset, repeat, strength };
}

export const MATERIAL_CATALOG = {
  wood: {
    defaults: { color: '#9a6a3a', metalness: 0, roughness: 0.62 },
    defaultVariant: 'oak',
    defaultPattern: 'grain',
    defaultFinish: 'satin',
    variants: {
      oak: { color: '#9a6a3a' },
      walnut: { color: '#5b341f' },
      pine: { color: '#d2aa68' },
      maple: { color: '#c99f63' },
    },
    patterns: {
      grain: { textures: { map: texture('wood.rings', [2, 1], 3), bumpMap: texture('wood.rings', [2, 1], 1) } },
      linear: { textures: { map: texture('wood.linear', [3, 1], 3), bumpMap: texture('wood.linear', [3, 1], 1) } },
    },
    finishes: {
      raw: { roughness: 0.85, reflectivity: 0.05 },
      matte: { roughness: 0.72, reflectivity: 0.08 },
      satin: { roughness: 0.45, reflectivity: 0.2 },
      glossy: { roughness: 0.18, reflectivity: 0.45, clearcoat: 0.35 },
      polished: { roughness: 0.14, reflectivity: 0.5, clearcoat: 0.45 },
    },
  },
  metal: {
    defaults: { color: '#b8bcc4', metalness: 0.82, roughness: 0.36 },
    defaultPattern: 'brushed',
    defaultFinish: 'semi-gloss',
    patterns: {
      brushed: { textures: { roughnessMap: texture('metal.brushed', [8, 1], 2) } },
      cast: { roughness: 0.62, textures: { roughnessMap: texture('metal.cast', [5, 5], 3), bumpMap: texture('metal.cast', [5, 5], 1) } },
      polished: {},
    },
    finishes: {
      rough: { roughness: 0.72, reflectivity: 0.25 },
      matte: { roughness: 0.55, reflectivity: 0.35 },
      'semi-gloss': { roughness: 0.28, reflectivity: 0.65 },
      glossy: { roughness: 0.16, reflectivity: 0.78 },
      mirror: { roughness: 0.04, reflectivity: 0.95 },
    },
  },
  ceramic: {
    defaults: { color: '#f4f0e8', metalness: 0, roughness: 0.5 },
    defaultPattern: 'smooth',
    defaultFinish: 'glazed',
    patterns: {
      smooth: {},
      speckled: { textures: { map: texture('ceramic.speckle', [4, 4], 2), bumpMap: texture('ceramic.speckle', [4, 4], 1) } },
      clay: { color: '#b66a45', textures: { bumpMap: texture('ceramic.clay', [5, 5], 2) } },
    },
    finishes: {
      matte: { roughness: 0.72, reflectivity: 0.12 },
      satin: { roughness: 0.42, reflectivity: 0.25 },
      glazed: { roughness: 0.18, reflectivity: 0.55, clearcoat: 0.65 },
      glossy: { roughness: 0.12, reflectivity: 0.65, clearcoat: 0.8 },
    },
  },
  plastic: {
    defaults: { color: '#64748b', metalness: 0, roughness: 0.7 },
    defaultFinish: 'matte',
    finishes: {
      matte: { roughness: 0.7, reflectivity: 0.08 },
      satin: { roughness: 0.42, reflectivity: 0.18 },
      glossy: { roughness: 0.18, reflectivity: 0.35, clearcoat: 0.25 },
    },
  },
  fabric: {
    aliases: ['upholstery'],
    defaults: { roughness: 0.88, metalness: 0 },
    defaultPattern: 'weave',
    defaultFinish: 'matte',
    patterns: {
      weave: { textures: { roughnessMap: texture('fabric.weave', [6, 6], 3), bumpMap: texture('fabric.weave', [6, 6], 2) } },
      knit: { textures: { roughnessMap: texture('fabric.knit', [7, 7], 3), bumpMap: texture('fabric.knit', [7, 7], 3) } },
      corduroy: { textures: { roughnessMap: texture('fabric.corduroy', [5, 1], 3), bumpMap: texture('fabric.corduroy', [5, 1], 3) } },
    },
    finishes: { matte: { roughness: 0.88, reflectivity: 0.02 }, satin: { roughness: 0.7, reflectivity: 0.08 } },
  },
  concrete: {
    defaults: { color: '#8b8680', metalness: 0, roughness: 0.82 },
    defaultPattern: 'aggregate',
    defaultFinish: 'raw',
    patterns: {
      aggregate: { textures: { map: texture('concrete.aggregate', [4, 4], 2), bumpMap: texture('concrete.aggregate', [4, 4], 2) } },
      smooth: { textures: { bumpMap: texture('concrete.smooth', [3, 3], 1) } },
    },
    finishes: {
      raw: { roughness: 0.86, reflectivity: 0.04 },
      matte: { roughness: 0.76, reflectivity: 0.08 },
      polished: { roughness: 0.28, reflectivity: 0.32, clearcoat: 0.2 },
    },
  },
  stone: {
    defaults: { color: '#8a8178', metalness: 0, roughness: 0.68 },
    defaultVariant: 'granite',
    defaultPattern: 'vein',
    defaultFinish: 'honed',
    variants: {
      granite: { color: '#8a8178' },
      marble: { color: '#d8d3c8' },
      slate: { color: '#3f4850' },
      limestone: { color: '#c6b89e' },
    },
    patterns: {
      vein: { textures: { map: texture('stone.vein', [2, 2], 3), bumpMap: texture('stone.vein', [2, 2], 1) } },
      granite: { textures: { map: texture('stone.granite', [4, 4], 3), bumpMap: texture('stone.granite', [4, 4], 1) } },
      slate: { textures: { map: texture('stone.slate', [3, 1], 2), bumpMap: texture('stone.slate', [3, 1], 2) } },
    },
    finishes: {
      raw: { roughness: 0.86, reflectivity: 0.04 },
      honed: { roughness: 0.52, reflectivity: 0.18 },
      polished: { roughness: 0.16, reflectivity: 0.48, clearcoat: 0.35 },
      glossy: { roughness: 0.12, reflectivity: 0.56, clearcoat: 0.5 },
    },
  },
  glass: {
    defaults: { color: '#d9f4ff', metalness: 0, roughness: 0.02, opacity: 0.28, transmission: 0.75, reflectivity: 0.8, ior: 1.45 },
    defaultVariant: 'clear',
    defaultPattern: 'smooth',
    defaultFinish: 'glossy',
    variants: {
      clear: { color: '#e8fbff', opacity: 0.22 },
      frosted: { color: '#d7edf2', opacity: 0.46, transmission: 0.45, roughness: 0.38 },
      tinted: { color: '#9fc7d8', opacity: 0.34 },
      smoky: { color: '#5f7378', opacity: 0.4, transmission: 0.38 },
    },
    patterns: {
      smooth: {},
      frosted: { roughness: 0.42, textures: { roughnessMap: texture('glass.frosted', [5, 5], 2), bumpMap: texture('glass.frosted', [5, 5], 1) } },
      reeded: { textures: { roughnessMap: texture('glass.reeded', [8, 1], 2), bumpMap: texture('glass.reeded', [8, 1], 2) } },
    },
    finishes: {
      glossy: { roughness: 0.02, reflectivity: 0.82, clearcoat: 1 },
      frosted: { roughness: 0.45, reflectivity: 0.35 },
      mirror: { roughness: 0.01, reflectivity: 0.95, clearcoat: 1 },
    },
  },
  leather: {
    defaults: { color: '#6b3f24', metalness: 0, roughness: 0.56 },
    defaultVariant: 'brown',
    defaultPattern: 'grain',
    defaultFinish: 'satin',
    variants: {
      brown: { color: '#6b3f24' },
      black: { color: '#1f1b18' },
      tan: { color: '#b77945' },
      oxblood: { color: '#5b1f24' },
    },
    patterns: {
      grain: { textures: { roughnessMap: texture('leather.grain', [5, 5], 3), bumpMap: texture('leather.grain', [5, 5], 2) } },
      pebbled: { textures: { roughnessMap: texture('leather.pebbled', [6, 6], 3), bumpMap: texture('leather.pebbled', [6, 6], 3) } },
      smooth: { textures: { bumpMap: texture('leather.smooth', [4, 4], 1) } },
    },
    finishes: {
      matte: { roughness: 0.72, reflectivity: 0.08 },
      satin: { roughness: 0.48, reflectivity: 0.18 },
      glossy: { roughness: 0.22, reflectivity: 0.34, clearcoat: 0.22 },
      worn: { roughness: 0.82, reflectivity: 0.05 },
    },
  },
} satisfies Record<string, CatalogEntry>;

export const MATERIAL_PRESET_ALIASES: Record<string, string> = {
  'upholstery.fabric': 'material: fabric; pattern: weave; finish: matte',
  'wood.oak': 'material: wood; grain: oak; pattern: grain; finish: satin',
  'metal.brushed': 'material: metal; pattern: brushed; finish: semi-gloss',
  'plastic.matte': 'material: plastic; finish: matte',
};

function cloneTextures(textures: TextureMap | undefined): TextureMap | undefined {
  if (!textures) return undefined;
  return Object.fromEntries(Object.entries(textures).map(([channel, spec]) => [channel, { ...spec, ...(spec.repeat ? { repeat: [...spec.repeat] } : {}), ...(spec.offset ? { offset: [...spec.offset] } : {}) }])) as TextureMap;
}

function mergeMaterial(base: MaterialDefaults, override: MaterialDefaults | undefined): MaterialDefaults {
  if (!override) return { ...base, textures: cloneTextures(base.textures) };
  const textures = { ...(cloneTextures(base.textures) ?? {}), ...(cloneTextures(override.textures) ?? {}) };

  return {
    ...base,
    ...override,
    textures: Object.keys(textures).length > 0 ? textures : undefined,
  };
}

export function materialCatalogNames(): string[] {
  return Object.keys(MATERIAL_CATALOG);
}

export function materialPatternNames(family: string): string[] {
  const entry = MATERIAL_CATALOG[family as SemanticMaterialFamily] as CatalogEntry | undefined;
  return Object.keys(entry?.patterns ?? {});
}

export function materialFinishNames(family: string): string[] {
  const entry = MATERIAL_CATALOG[family as SemanticMaterialFamily] as CatalogEntry | undefined;
  return Object.keys(entry?.finishes ?? {});
}

export function resolveSemanticMaterial(options: { material?: string; variant?: string; grain?: string; pattern?: string; finish?: string }): { material?: MaterialDefaults; diagnostics: string[] } {
  const diagnostics: string[] = [];
  if (!options.material) return { diagnostics };

  const aliasTarget = Object.entries(MATERIAL_CATALOG as Record<string, CatalogEntry>).find(([, entry]) => entry.aliases?.includes(options.material ?? ''))?.[0];
  const family = aliasTarget ?? options.material;
  const entry = MATERIAL_CATALOG[family as SemanticMaterialFamily] as CatalogEntry | undefined;
  if (!entry) {
    return { diagnostics: [`Unsupported material "${options.material}". Supported materials: ${materialCatalogNames().join(', ')}.`] };
  }

  const variantName = options.grain ?? options.variant ?? entry.defaultVariant;
  const patternName = options.pattern ?? entry.defaultPattern;
  const finishName = options.finish ?? entry.defaultFinish;
  let resolved = mergeMaterial({}, entry.defaults);

  if (variantName) {
    const variant = entry.variants?.[variantName];
    if (!variant) diagnostics.push(`Unsupported ${family} variant "${variantName}". Supported variants: ${Object.keys(entry.variants ?? {}).join(', ') || 'none'}.`);
    resolved = mergeMaterial(resolved, variant);
  }

  if (patternName) {
    const pattern = entry.patterns?.[patternName];
    if (!pattern) diagnostics.push(`Unsupported ${family} pattern "${patternName}". Supported patterns: ${materialPatternNames(family).join(', ') || 'none'}.`);
    resolved = mergeMaterial(resolved, pattern);
  }

  if (finishName) {
    const finish = entry.finishes?.[finishName];
    if (!finish) diagnostics.push(`Unsupported ${family} finish "${finishName}". Supported finishes: ${materialFinishNames(family).join(', ') || 'none'}.`);
    resolved = mergeMaterial(resolved, finish);
  }

  return { material: resolved, diagnostics };
}
