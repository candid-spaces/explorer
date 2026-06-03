import type {
  DslBoxSpec,
  DslGeometrySpec,
  DslMaterialSpec,
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
}

interface ResolvedProperties {
  material: DslMaterialSpec;
  geometry: DslGeometrySpec;
  transform: DslTransformSpec;
}

const DEFAULT_PROPERTIES: ResolvedProperties = {
  material: { diagnostics: [] },
  geometry: { kind: 'box', diagnostics: [] },
  transform: { rotation: [0, 0, 0], diagnostics: [] },
};

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
      color: overrideMaterial.color ?? base.material.color,
      metalness: overrideMaterial.metalness ?? base.material.metalness,
      roughness: overrideMaterial.roughness ?? base.material.roughness,
    },
    geometry: overrideGeometry.declared ? { ...overrideGeometry, diagnostics: [] } : { ...base.geometry, diagnostics: [] },
    transform:
      includeTransform && overrideTransform.declared
        ? { ...overrideTransform, diagnostics: [] }
        : { ...base.transform, diagnostics: [] },
  };
}

function namespacePrefixes(namespace: string[]): string[] {
  return namespace.map((_, index) => canonicalNamespacePath(namespace.slice(0, index + 1)));
}

function firstInstanceByNamespace(objects: SpatialObject[]): Map<string, SpatialObject> {
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
      properties = mergeProperties(properties, instance, { includeTransform: false });
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
      const target = namespaceDeclarations.get(targetPath) ?? namespaceInstances.get(targetPath);

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
        const resolvedTarget = resolvePropertiesFor(target, namespaceDeclarations, namespaceInstances, [...visitedRefs, targetPath]);
        diagnostics.push(...resolvedTarget.diagnostics);
        properties = mergeProperties(properties, resolvedTarget.properties);
      }
    }
  }

  properties = mergeProperties(properties, object);

  return { properties, diagnostics };
}

function hasChildInstance(object: SpatialObject, instances: SpatialObject[]): boolean {
  if (object.namespace.length === 0) {
    return false;
  }

  return instances.some(
    (candidate) =>
      candidate !== object &&
      !candidate.declarationOnly &&
      candidate.namespace.length > object.namespace.length &&
      object.namespace.every((segment, index) => candidate.namespace[index] === segment),
  );
}

export function resolveDslDocument(objects: SpatialObject[]): { objects: ResolvedSpatialObject[]; diagnostics: ParseDiagnostic[] } {
  const diagnostics: ParseDiagnostic[] = [];
  const namespaceDeclarations = new Map<string, SpatialObject>();
  const namespaceInstances = firstInstanceByNamespace(objects);
  const instances = objects.filter((object) => !object.declarationOnly && object.box);

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

  const resolvedObjects = instances.map((object, index) => {
    const { properties, diagnostics: propertyDiagnostics } = resolvePropertiesFor(
      object,
      namespaceDeclarations,
      namespaceInstances,
    );
    diagnostics.push(...propertyDiagnostics);

    const namespacePath = canonicalNamespacePath(object.namespace);
    const parentNamespacePath = canonicalNamespacePath(object.namespace.slice(0, -1));
    const renderable = !hasChildInstance(object, instances);
    const duplicateSuffix = object.namespace.length > 0 ? `#${index + 1}` : '';

    return {
      ...object,
      id: object.namespace.length > 0 ? `${namespacePath}${object.box!.source}${duplicateSuffix}` : object.id,
      box: object.box!,
      namespacePath,
      parentNamespacePath,
      renderable,
      material: properties.material,
      geometry: properties.geometry,
      transform: properties.transform,
    };
  });

  return { objects: resolvedObjects, diagnostics };
}
