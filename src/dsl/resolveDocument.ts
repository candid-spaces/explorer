import type {
  DslBoxSpec,
  DslGeometrySpec,
  DslMaterialSpec,
  DslTextureChannel,
  DslTextureSpec,
  DslTransformSpec,
  ParseDiagnostic,
  SpatialObject,
} from './types';
import { canonicalNamespacePath } from './pathParser';

export interface ResolvedSpatialObject extends SpatialObject {
  box: DslBoxSpec;
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  transform: DslTransformSpec;
  namespacePath: string;
  parentNamespacePath: string;
  renderable: boolean;
  materializedFrom?: string;
  anchorScale?: [number, number, number];
}

interface ResolvedProperties {
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  transform: DslTransformSpec;
}


function cloneTextureSpec(texture: DslTextureSpec): DslTextureSpec {
  return {
    ...texture,
    ...(texture.repeat ? { repeat: [...texture.repeat] as [number, number] } : {}),
    ...(texture.offset ? { offset: [...texture.offset] as [number, number] } : {}),
  };
}

function mergeTextures(
  base: DslMaterialSpec['textures'],
  override: DslMaterialSpec['textures'],
): DslMaterialSpec['textures'] {
  const merged: DslMaterialSpec['textures'] = {};

  (Object.keys(base ?? {}) as DslTextureChannel[]).forEach((channel) => {
    const texture = base?.[channel];

    if (texture) {
      merged[channel] = cloneTextureSpec(texture);
    }
  });

  (Object.keys(override ?? {}) as DslTextureChannel[]).forEach((channel) => {
    const baseTexture = merged[channel];
    const overrideTexture = override?.[channel];

    if (overrideTexture) {
      merged[channel] = {
        ...(baseTexture ? cloneTextureSpec(baseTexture) : {}),
        ...cloneTextureSpec(overrideTexture),
      };
    }
  });

  return Object.keys(merged).length > 0 ? merged : undefined;
}

const DEFAULT_PROPERTIES: ResolvedProperties = {
  material: { diagnostics: [] },
  geometry: { kind: 'box', diagnostics: [] },
  transform: { rotation: [0, 0, 0], diagnostics: [] },
};

function mergeGeometry(
  base: DslGeometrySpec,
  override: DslGeometrySpec,
): DslGeometrySpec {
  if (!override.declared) {
    return { ...base, diagnostics: [] };
  }

  const kind = override.kindDeclared ? override.kind : base.kind;

  return {
    diagnostics: [],
    declared: true,
    ...(override.kindDeclared
      ? { kindDeclared: true }
      : { kindDeclared: base.kindDeclared }),
    kind,
    ...(kind === 'box'
      ? {
          'box-radius': override['box-radius'] ?? base['box-radius'],
          puff: override.puff ?? base.puff,
        }
      : {}),
  };
}

function mergeProperties(
  base: ResolvedProperties,
  override: SpatialObject | ResolvedProperties,
  options: { includeTransform?: boolean } = {},
): ResolvedProperties {
  const overrideMaterial = override.material;
  const overrideGeometry = override.geometry;
  const overrideTransform = override.transform;
  const includeTransform = options.includeTransform ?? true;

  return {
    material: {
      diagnostics: [],
      materialPreset: overrideMaterial.materialPreset ?? base.material.materialPreset,
      textures: mergeTextures(base.material.textures, overrideMaterial.textures),
      color: overrideMaterial.color ?? base.material.color,
      metalness: overrideMaterial.metalness ?? base.material.metalness,
      roughness: overrideMaterial.roughness ?? base.material.roughness,
    },
    geometry: mergeGeometry(base.geometry, overrideGeometry),
    transform:
      includeTransform && overrideTransform.declared
        ? { ...overrideTransform, diagnostics: [] }
        : { ...base.transform, diagnostics: [] },
  };
}

function namespacePrefixes(namespace: string[]): string[] {
  return namespace.map((_, index) =>
    canonicalNamespacePath(namespace.slice(0, index + 1)),
  );
}

function firstInstanceByNamespace(
  objects: SpatialObject[],
): Map<string, SpatialObject> {
  const instances = new Map<string, SpatialObject>();

  objects.forEach((object) => {
    if (!object.declarationOnly && object.namespace.length > 0) {
      const key = canonicalNamespacePath(object.namespace);
      if (!instances.has(key)) {
        instances.set(key, object);
      }
    }
  });

  return instances;
}

function resolvePropertiesFor(
  object: SpatialObject,
  namespaceDeclarations: Map<string, SpatialObject>,
  namespaceInstances: Map<string, SpatialObject>,
  visitedRefs: string[] = [],
): { properties: ResolvedProperties; diagnostics: ParseDiagnostic[] } {
  let properties = { ...DEFAULT_PROPERTIES };
  const diagnostics: ParseDiagnostic[] = [];

  const fullNamespacePath = canonicalNamespacePath(object.namespace);

  namespacePrefixes(object.namespace).forEach((prefix) => {
    const declaration = namespaceDeclarations.get(prefix);
    if (declaration && declaration !== object) {
      properties = mergeProperties(properties, declaration);
    }

    const instance = namespaceInstances.get(prefix);
    if (prefix !== fullNamespacePath && instance && instance !== object) {
      properties = mergeProperties(properties, instance, {
        includeTransform: false,
      });
    }
  });

  if (object.reference.targetPath) {
    const targetPath = object.reference.targetPath;

    if (visitedRefs.includes(targetPath)) {
      diagnostics.push({
        line: object.lineNumber,
        source: object.source,
        message: `Cyclic ref detected: ${[...visitedRefs, targetPath].join(' -> ')}`,
      });
    } else {
      const target =
        namespaceDeclarations.get(targetPath) ??
        namespaceInstances.get(targetPath);

      if (!target) {
        diagnostics.push({
          line: object.lineNumber,
          source: object.source,
          message: `Reference target "${targetPath}" was not found.`,
        });
      } else if (target.lineNumber >= object.lineNumber) {
        diagnostics.push({
          line: object.lineNumber,
          source: object.source,
          message: `Reference target "${targetPath}" must be declared before it is referenced.`,
        });
      } else {
        const resolvedTarget = resolvePropertiesFor(
          target,
          namespaceDeclarations,
          namespaceInstances,
          [...visitedRefs, targetPath],
        );
        diagnostics.push(...resolvedTarget.diagnostics);
        properties = mergeProperties(properties, resolvedTarget.properties);
      }
    }
  }

  properties = mergeProperties(properties, object);

  return { properties, diagnostics };
}

function namespaceStartsWith(namespace: string[], prefix: string[]): boolean {
  return prefix.every((segment, index) => namespace[index] === segment);
}

function hasConcreteAncestorInstance(
  object: SpatialObject,
  concreteNamespaces: Set<string>,
): boolean {
  if (object.namespace.length <= 1) {
    return true;
  }

  for (let length = object.namespace.length - 1; length > 0; length -= 1) {
    if (
      concreteNamespaces.has(
        canonicalNamespacePath(object.namespace.slice(0, length)),
      )
    ) {
      return true;
    }
  }

  return false;
}

function concreteNamespaceSet(objects: SpatialObject[]): Set<string> {
  const concreteNamespaces = new Set<string>();

  objects
    .filter(
      (object) =>
        !object.declarationOnly && object.box && object.namespace.length <= 1,
    )
    .forEach((object) =>
      concreteNamespaces.add(canonicalNamespacePath(object.namespace)),
    );

  let changed = true;
  while (changed) {
    changed = false;

    objects.forEach((object) => {
      if (
        object.declarationOnly ||
        !object.box ||
        object.namespace.length === 0
      ) {
        return;
      }

      const key = canonicalNamespacePath(object.namespace);
      if (
        !concreteNamespaces.has(key) &&
        hasConcreteAncestorInstance(object, concreteNamespaces)
      ) {
        concreteNamespaces.add(key);
        changed = true;
      }
    });
  }

  return concreteNamespaces;
}

function hasMaterializedChildInstance(
  object: ResolvedSpatialObject,
  instances: ResolvedSpatialObject[],
): boolean {
  if (object.namespace.length === 0) {
    return false;
  }

  return instances.some(
    (candidate) =>
      candidate !== object &&
      candidate.namespace.length > object.namespace.length &&
      object.namespace.every(
        (segment, index) => candidate.namespace[index] === segment,
      ),
  );
}

function mergeResolvedProperties(
  base: ResolvedProperties,
  override: ResolvedProperties,
): ResolvedProperties {
  return mergeProperties(base, override);
}

function dimensionsFromBox(box: DslBoxSpec): [number, number, number] {
  return [box.width, box.height, box.depth];
}

function dimensionsFromRootChildren(
  descendants: SpatialObject[],
  targetNamespace: string[],
): [number, number, number] | undefined {
  const rootChildren = descendants.filter(
    (descendant) => descendant.namespace.length === targetNamespace.length + 1,
  );
  const boxes = (rootChildren.length > 0 ? rootChildren : descendants)
    .map((descendant) => descendant.box)
    .filter(Boolean) as DslBoxSpec[];

  if (boxes.length === 0) {
    return undefined;
  }

  const minX = Math.min(...boxes.map((box) => box.x));
  const minY = Math.min(...boxes.map((box) => box.y));
  const minZ = Math.min(...boxes.map((box) => box.z));
  const maxX = Math.max(...boxes.map((box) => box.x + box.width));
  const maxY = Math.max(...boxes.map((box) => box.y + box.height));
  const maxZ = Math.max(...boxes.map((box) => box.z + box.depth));

  return [maxX - minX, maxY - minY, maxZ - minZ];
}

function scaleToFit(
  sourceDimensions: [number, number, number] | undefined,
  targetBox: DslBoxSpec,
): [number, number, number] | undefined {
  if (
    !sourceDimensions ||
    sourceDimensions.some((dimension) => dimension <= 0)
  ) {
    return undefined;
  }

  return [
    targetBox.width / sourceDimensions[0],
    targetBox.height / sourceDimensions[1],
    targetBox.depth / sourceDimensions[2],
  ];
}

export function resolveDslDocument(objects: SpatialObject[]): {
  objects: ResolvedSpatialObject[];
  diagnostics: ParseDiagnostic[];
} {
  const diagnostics: ParseDiagnostic[] = [];
  const namespaceDeclarations = new Map<string, SpatialObject>();
  const namespaceInstances = firstInstanceByNamespace(objects);
  const instances = objects.filter(
    (object) => !object.declarationOnly && object.box,
  );
  const concreteNamespaces = concreteNamespaceSet(objects);

  objects.forEach((object) => {
    if (!object.declarationOnly) {
      return;
    }

    const key = canonicalNamespacePath(object.namespace);
    if (namespaceDeclarations.has(key)) {
      diagnostics.push({
        line: object.lineNumber,
        source: object.source,
        message: `Namespace "${key}" was already declared; using the latest declaration.`,
      });
    }

    namespaceDeclarations.set(key, object);
  });

  const resolveObject = (
    object: SpatialObject,
    index: number,
    options: {
      materializedFrom?: string;
      namespace?: string[];
      idPrefix?: string;
    } = {},
  ): ResolvedSpatialObject => {
    const { properties, diagnostics: propertyDiagnostics } =
      resolvePropertiesFor(object, namespaceDeclarations, namespaceInstances);
    diagnostics.push(...propertyDiagnostics);

    const namespace = options.namespace ?? object.namespace;
    const namespacePath = canonicalNamespacePath(namespace);
    const parentNamespacePath = canonicalNamespacePath(namespace.slice(0, -1));
    const duplicateSuffix = namespace.length > 0 ? `#${index + 1}` : '';
    const idPath =
      namespace.length > 0
        ? `${namespacePath}${object.box!.source}${duplicateSuffix}`
        : object.id;

    return {
      ...object,
      namespace,
      id: options.idPrefix ? `${options.idPrefix}${idPath}` : idPath,
      box: object.box!,
      namespacePath,
      parentNamespacePath,
      renderable: false,
      material: properties.material,
      geometry: properties.geometry,
      transform: properties.transform,
      materializedFrom: options.materializedFrom,
    };
  };

  const resolvedObjects = instances.map((object, index) =>
    resolveObject(object, index),
  );
  const originalByObject = new Map<SpatialObject, ResolvedSpatialObject>();
  instances.forEach((object, index) =>
    originalByObject.set(object, resolvedObjects[index]),
  );
  const materializedObjects: ResolvedSpatialObject[] = [];
  const anchorScaleById = new Map<string, [number, number, number]>();

  resolvedObjects.forEach((object, objectIndex) => {
    if (
      !object.reference.targetPath ||
      !hasConcreteAncestorInstance(object, concreteNamespaces)
    ) {
      return;
    }

    const targetNamespace = object.reference.targetPath
      .split('/')
      .filter(Boolean);
    const descendants = instances.filter(
      (candidate) =>
        candidate !== object &&
        candidate.namespace.length > targetNamespace.length &&
        namespaceStartsWith(candidate.namespace, targetNamespace),
    );
    const isCompoundReference = descendants.length > 0;
    const instanceNamespace =
      isCompoundReference && object.namespace.length === 0
        ? [`Ref${objectIndex + 1}`]
        : object.namespace;

    if (isCompoundReference && object.namespace.length === 0) {
      object.namespace = instanceNamespace;
      object.namespacePath = canonicalNamespacePath(instanceNamespace);
      object.parentNamespacePath = canonicalNamespacePath(
        instanceNamespace.slice(0, -1),
      );
    }

    const target = namespaceInstances.get(object.reference.targetPath);
    const anchorScale = object.reference.scale
      ? scaleToFit(
          target?.box
            ? dimensionsFromBox(target.box)
            : dimensionsFromRootChildren(descendants, targetNamespace),
          object.box,
        )
      : undefined;

    if (anchorScale) {
      anchorScaleById.set(object.id, anchorScale);
    }

    descendants.forEach((descendant, descendantIndex) => {
      const resolvedDescendant =
        originalByObject.get(descendant) ??
        resolveObject(descendant, descendantIndex);
      const suffix = descendant.namespace.slice(targetNamespace.length);
      const namespace = [...instanceNamespace, ...suffix];
      const properties = mergeResolvedProperties(
        {
          material: object.material,
          geometry: object.geometry,
          transform: object.transform,
        },
        {
          material: resolvedDescendant.material,
          geometry: resolvedDescendant.geometry,
          transform: resolvedDescendant.transform,
        },
      );

      materializedObjects.push({
        ...resolvedDescendant,
        id: `${object.id}->${resolvedDescendant.namespacePath}${resolvedDescendant.box.source}#${objectIndex + 1}-${descendantIndex + 1}`,
        namespace,
        namespacePath: canonicalNamespacePath(namespace),
        parentNamespacePath: canonicalNamespacePath(namespace.slice(0, -1)),
        material: properties.material,
        geometry: properties.geometry,
        transform: properties.transform,
        reference: { diagnostics: [] },
        materializedFrom: object.reference.targetPath,
        renderable: false,
      });
    });
  });

  const allObjects = [...resolvedObjects, ...materializedObjects];
  const materializedConcreteNamespaces = new Set(concreteNamespaces);
  materializedObjects.forEach((object) =>
    materializedConcreteNamespaces.add(object.namespacePath),
  );

  const renderEligibleObjects = allObjects.filter(
    (object) =>
      object.materializedFrom ||
      hasConcreteAncestorInstance(object, materializedConcreteNamespaces),
  );

  return {
    objects: allObjects.map((object) => ({
      ...object,
      anchorScale: anchorScaleById.get(object.id) ?? object.anchorScale,
      renderable:
        renderEligibleObjects.includes(object) &&
        !hasMaterializedChildInstance(object, renderEligibleObjects),
    })),
    diagnostics,
  };
}
